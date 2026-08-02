import { HttpClient } from '@angular/common/http'
import { DOCUMENT, Injectable, inject, NgZone, signal } from '@angular/core'
import { ActivatedRoute, type Params, Router } from '@angular/router'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { AlertController } from '@ionic/angular/standalone'
import { TranslateService } from '@ngx-translate/core'
import {
    type CompassHeading,
    type EventShowModal,
    type FeatureIdSource,
    type MapMode,
    type OsmGoFeature,
    type OsmGoFeatureCollection,
    type OsmGoMarker,
    type Sprite,
    TagConfig,
} from '@osmgo/type'
import { setIconStyle } from '@scripts/osmToOsmgo/index.js'
import { AlertService } from '@services/alert.service'
import type { Basemap } from '@services/basemaps.service'
import { type Config, ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { LocationService } from '@services/location.service'
import { TagsService } from '@services/tags.service'
import { destination, point } from '@turf/turf'
import type {
    BBox,
    Feature,
    FeatureCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    Point,
} from 'geojson'
import { cloneDeep, uniqBy } from 'lodash'
import {
    AttributionControl,
    type FilterSpecification,
    type GeoJSONSource,
    type LngLat,
    type LngLatLike,
    Map,
    type MapGeoJSONFeature,
    Marker,
    NavigationControl,
    type RasterSourceSpecification,
    ScaleControl,
    type StyleSpecification,
} from 'maplibre-gl'
import { type Observable, of, Subject } from 'rxjs'
import { debounceTime, filter, map, throttleTime } from 'rxjs/operators'
import type { ModalDismissData } from '../components/modal/modal'

export const getMarkerLayout = () => ({
    'icon-image': '{marker}',
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-anchor': 'bottom' as const,
})

type HeadingWithTrueHeading = CompassHeading & { trueHeading: number }
type LoadedMapImage = Awaited<ReturnType<Map['loadImage']>>['data']
type IconParameters = { shape: string; color: string; id: string }

@Injectable({ providedIn: 'root' })
export class MapService {
    private readonly _ngZone = inject(NgZone)
    readonly dataService = inject(DataService)
    readonly tagsService = inject(TagsService)
    readonly alertService = inject(AlertService)
    readonly locationService = inject(LocationService)
    readonly configService = inject(ConfigService)
    private readonly zone = inject(NgZone)
    private readonly alertCtrl = inject(AlertController)
    private readonly http = inject(HttpClient)
    private readonly translate = inject(TranslateService)
    private readonly router = inject(Router)
    private readonly activatedRoute = inject(ActivatedRoute)
    private readonly document = inject(DOCUMENT)

    isFirstPosition: boolean = true
    private readonly loadingDataState = signal(false)
    readonly loadingData = this.loadingDataState.asReadonly()
    private readonly processingState = signal(false)
    readonly isProcessing = this.processingState.asReadonly()

    spritesCache: HTMLImageElement | undefined
    constructor() {
        // Preload sprites
        const pathSprites =
            window.devicePixelRatio === 1
                ? `assets/mapStyle/sprites/sprites.png`
                : `assets/mapStyle/sprites/sprites@2x.png`
        const spriteImage = new Image()
        spriteImage.onload = () => {
            this.spritesCache = spriteImage
        }
        spriteImage.onerror = (error) => {
            console.error(error)
        }
        spriteImage.src = pathSprites

        this.locationService.locationReady$.subscribe(() => {
            if (this.map && this.configService.config().centerWhenGpsIsReady) {
                this.map.setZoom(19)
            }
        })

        this.markerRedraw$.subscribe((geojson) => {
            const missingMarker: string[] = []
            for (const feature of geojson.features) {
                const marker = feature.properties.marker
                if (
                    !this.map.hasImage(marker) &&
                    !missingMarker.includes(marker)
                ) {
                    missingMarker.push(marker)
                }
            }
            const t1 = new Date().getTime()
            this.addMissingIconsToMap(missingMarker)
                .then(() => {
                    console.log(
                        'addMissingIconsToMap TIME',
                        new Date().getTime() - t1,
                        'count :',
                        missingMarker.length
                    )
                    if (geojson) {
                        const source = this.map.getSource(
                            'data'
                        ) as GeoJSONSource
                        source.setData(geojson)
                        this.drawWaysPoly(geojson, 'ways')
                    }
                })
                .catch((err) => {
                    console.error(err)
                })
        })

        this.changedMarkerRedraw$.subscribe(
            (geojson: OsmGoFeatureCollection) => {
                const missingMarker: string[] = []
                for (const feature of geojson.features) {
                    const marker = feature.properties.marker
                    if (
                        !this.map.hasImage(marker) &&
                        !missingMarker.includes(marker)
                    ) {
                        missingMarker.push(marker)
                    }
                }
                const t1 = new Date().getTime()
                this.addMissingIconsToMap(missingMarker)
                    .then(() => {
                        console.log(
                            'addMissingIconsToMapChange TIME',
                            new Date().getTime() - t1
                        )
                        if (geojson) {
                            const source = this.map.getSource(
                                'data_changed'
                            ) as GeoJSONSource
                            source.setData(geojson)
                            this.drawWaysPoly(geojson, 'ways_changed')
                        }
                    })
                    .catch((err) => {
                        console.error(err)
                    })
            }
        )

        this.mapMove$.pipe(debounceTime(700)).subscribe(() => {
            const mapCenter = this.map.getCenter()
            const mapBearing = this.map.getBearing()
            const mapZoom = this.map.getZoom()
            const currentView = {
                lng: mapCenter.lng,
                lat: mapCenter.lat,
                zoom: mapZoom,
                bearing: mapBearing,
            }
            this.configService.setLastView(currentView)
        })
    }

    map!: Map
    markerMove!: OsmGoMarker<OsmGoFeature<Point>>
    private readonly markerMoveMovingState = signal(false)
    readonly markerMoveMoving = this.markerMoveMovingState.asReadonly()
    mode: MapMode = 'Update'
    headingIsLocked: boolean = true
    private lastRenderedHeading: number | null = null
    positionIsFollow: boolean = true
    private readonly isDisplaySatelliteBaseMapState = signal(false)
    readonly isDisplaySatelliteBaseMap =
        this.isDisplaySatelliteBaseMapState.asReadonly()

    layersAreLoaded: boolean = false

    private readonly bboxChangedSubject = new Subject<OsmGoFeatureCollection>()
    readonly bboxChanged$ = this.bboxChangedSubject.asObservable()
    private readonly moveElementSubject = new Subject<ModalDismissData>()
    readonly moveElement$ = this.moveElementSubject.asObservable()
    private readonly showModalSubject = new Subject<EventShowModal>()
    readonly showModal$ = this.showModalSubject.asObservable()
    private readonly markerRedrawSubject = new Subject<OsmGoFeatureCollection>()
    readonly markerRedraw$ = this.markerRedrawSubject.asObservable()
    private readonly mapLoadedSubject = new Subject<void>()
    readonly mapLoaded$ = this.mapLoadedSubject.asObservable()
    private readonly changedMarkerRedrawSubject =
        new Subject<OsmGoFeatureCollection>()
    readonly changedMarkerRedraw$ =
        this.changedMarkerRedrawSubject.asObservable()
    private readonly featureChoiceSubject = new Subject<MapGeoJSONFeature[]>()
    readonly featureChoiceRequested$ = this.featureChoiceSubject.asObservable()
    markersLayer: OsmGoMarker[] = []

    attributionControl!: AttributionControl

    private readonly markerMoveSubject = new Subject<LngLat>()
    readonly markerMove$ = this.markerMoveSubject.asObservable()
    private readonly mapMoveSubject = new Subject<void>()
    readonly mapMove$ = this.mapMoveSubject.asObservable()
    private readonly markerMovingState = signal(false)
    readonly markerMoving = this.markerMovingState.asReadonly()
    markerPositionate!: OsmGoMarker<string>
    markerMaplibreUnknown: Record<string, LoadedMapImage> = {}

    setIsProcessing(isProcessing: boolean): void {
        this.processingState.set(isProcessing)
    }

    redrawBbox(geojson: OsmGoFeatureCollection): void {
        this.bboxChangedSubject.next(geojson)
    }

    moveElement(data: ModalDismissData): void {
        this.moveElementSubject.next(data)
    }

    showModal(data: EventShowModal): void {
        this.showModalSubject.next(data)
    }

    redrawMarkers(geojson: OsmGoFeatureCollection): void {
        this.markerRedrawSubject.next(geojson)
    }

    redrawChangedMarkers(geojson: OsmGoFeatureCollection): void {
        this.changedMarkerRedrawSubject.next(geojson)
    }

    async loadUnknownMarker(factor: number): Promise<void> {
        const roundedFactor = factor > 1 ? 2 : 1
        const markerShapes = ['circle', 'penta', 'square']
        await Promise.all(
            markerShapes.map(async (shape) => {
                const response = await this.map.loadImage(
                    `./assets/mapStyle/unknown-marker/${shape}-unknown@${roundedFactor}X.png`
                )
                this.markerMaplibreUnknown[shape] = response.data
            })
        )
    }

    filterMakerByIds(ids: string[]): void {
        const layersIds = [
            'way_fill',
            'way_line',
            'label',
            'icon-old',
            'icon-fixme',
            'marker',
        ]
        if (ids.length === 0) {
            ids = ['']
        }

        for (const layerId of layersIds) {
            const currentFilter = cloneDeep(this.map.getFilter(layerId))
            if (!Array.isArray(currentFilter)) continue

            // Types are not correct for the match filter used in the next line.
            // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
            // prettier-ignore
            const newConfigIdFilter: FilterSpecification = [
                'match',
                ['get', 'configId'],
                [...ids],
                false,
                true,
            ]
            let newFilter: unknown[] = []

            let findedFilter = false
            for (let i = 1; i < currentFilter.length; i++) {
                const filterItem = currentFilter[i]
                if (this.isPropertyMatchFilter(filterItem, 'configId')) {
                    currentFilter[i] = newConfigIdFilter
                    newFilter = currentFilter
                    findedFilter = true
                }
            }

            if (!findedFilter) {
                newFilter = [...currentFilter, newConfigIdFilter]
            }

            this.map.setFilter(layerId, newFilter as FilterSpecification)
        }
    }

    drawWaysPoly(geojson: OsmGoFeatureCollection, source: string): void {
        const featuresWay: Feature[] = []
        for (const feature of geojson.features) {
            if (
                feature.properties.type !== 'node' &&
                feature.properties.way_geometry
            ) {
                featuresWay.push({
                    type: 'Feature',
                    properties: feature.properties,
                    geometry: feature.properties.way_geometry,
                })
            }
        }

        const mapSource = this.map.getSource(source) as GeoJSONSource
        mapSource.setData({ type: 'FeatureCollection', features: featuresWay })
    }

    /** Converts a distance in meters to pixels at the current map scale. */
    getPixelDistFromMeter(_map: Map, dist: number): number {
        const y = _map.getContainer().clientHeight / 2
        const mapWidth = _map.getContainer().clientWidth

        function getDistance(latlng1: LngLat, latlng2: LngLat): number {
            const R = 6371000
            const rad = Math.PI / 180,
                lat1 = latlng1.lat * rad,
                lat2 = latlng2.lat * rad,
                a =
                    Math.sin(lat1) * Math.sin(lat2) +
                    Math.cos(lat1) *
                        Math.cos(lat2) *
                        Math.cos((latlng2.lng - latlng1.lng) * rad)
            const maxMeters = R * Math.acos(Math.min(a, 1))
            return maxMeters
        }
        const distWidth = getDistance(
            _map.unproject([0, y]),
            _map.unproject([mapWidth, y])
        )
        const pxPerMeter = mapWidth / distWidth

        return Math.round(dist * pxPerMeter)
    }

    getBbox(): BBox {
        const marginBuffer = this.configService.getMapMarginBuffer() || 50
        const mapContainer = this.map.getContainer()
        const w = mapContainer.offsetWidth
        const h = mapContainer.offsetHeight
        const cUL = this.map.unproject([0, 0]).toArray()
        const cUR = this.map.unproject([w, 0]).toArray()
        const cLR = this.map.unproject([w, h]).toArray()
        const cLL = this.map.unproject([0, h]).toArray()

        const coordinates = [cUL, cUR, cLR, cLL, cUL]
        const longitudes = coordinates.map(([longitude]) => longitude)
        const latitudes = coordinates.map(([, latitude]) => latitude)

        const pointMin: Point = {
            type: 'Point',
            coordinates: [Math.min(...longitudes), Math.min(...latitudes)],
        }
        const pointMax: Point = {
            type: 'Point',
            coordinates: [Math.max(...longitudes), Math.max(...latitudes)],
        }
        const coordsMin = destination(pointMin, marginBuffer / 1000, -135)
            .geometry.coordinates
        const coordsMax = destination(pointMax, marginBuffer / 1000, 45)
            .geometry.coordinates
        const bbox: BBox = [
            coordsMin[0],
            coordsMin[1],
            coordsMax[0],
            coordsMax[1],
        ]
        return bbox
    }

    resetNorth(): void {
        this.map.resetNorth()
    }

    displaySatelliteBaseMap(baseMap: Basemap, isDisplay: boolean): void {
        const bmSource: RasterSourceSpecification = {
            type: 'raster',
            tiles: baseMap.tiles,
            tileSize: 256,
            maxzoom: baseMap.max_zoom,
        }

        if (this.map.hasControl(this.attributionControl)) {
            this.map.removeControl(this.attributionControl)
        }

        if (this.configService.config().basemap.id !== baseMap.id) {
            if (this.map.getLayer('basemap')) {
                this.map.removeLayer('basemap')
            }

            const mapSource = this.map.getSource('basemap')
            if (mapSource) {
                this.map.removeSource('basemap')
            }
            this.map.addSource('basemap', bmSource)
        }

        const mapSource = this.map.getSource('basemap')
        if (!mapSource) {
            this.map.addSource('basemap', bmSource)
        }

        if (isDisplay) {
            this.map.addLayer(
                {
                    id: 'basemap',
                    type: 'raster',
                    source: 'basemap',
                    minzoom: 0,
                },
                'bboxLayer'
            )

            this.attributionControl = new AttributionControl({
                customAttribution: baseMap?.attribution?.text
                    ? baseMap?.attribution?.text
                    : '',
            })

            this.map.addControl(this.attributionControl)

            this.isDisplaySatelliteBaseMapState.set(true)
        } else {
            this.attributionControl = new AttributionControl({
                customAttribution: '',
            })

            this.map.addControl(this.attributionControl)

            if (this.map.getLayer('basemap')) {
                this.map.removeLayer('basemap')
            }
            this.isDisplaySatelliteBaseMapState.set(false)
        }
    }
    centerOnMyPosition(): void {
        const currentZoom = this.map.getZoom()
        if (this.configService.config().lockMapHeading) {
            this.headingIsLocked = true
        }
        let bearing = 0
        if (this.configService.config().followPosition) {
            this.positionIsFollow = true
            if (this.configService.config().lockMapHeading) {
                bearing = this.locationService.compassHeading().trueHeading ?? 0

                this.map.setLayoutProperty('location_user', 'icon-rotate', 0)
            }
        }
        let newZoom = currentZoom
        if (currentZoom < 17) {
            newZoom = 18
        }
        this.map.flyTo({
            center: this.locationService.getCoordsPosition(),
            zoom: newZoom,
            bearing: bearing,
            speed: 2,
        })
    }
    changeLocationRadius(newRadius: number, transition = false): void {
        const pxRadius = this.getPixelDistFromMeter(this.map, newRadius)
        const duration = transition ? 300 : 0
        this.map.setPaintProperty(
            'location_circle',
            'circle-radius-transition',
            { duration: duration }
        )
        this.map.setPaintProperty('location_circle', 'circle-radius', pxRadius)
    }
    positionateMarker(): void {
        this.markerPositionate = this.createDomMoveMarker(
            [this.map.getCenter().lng, this.map.getCenter().lat],
            ''
        )
        this.markerMovingState.set(true)
        this.markerPositionate.addTo(this.map)
        this.markerMove$.subscribe((center) => {
            this.markerPositionate.setLngLat(center)
        })
    }

    openModalOsm(
        lngLat?: LngLat,
        tags?: Record<string, string | number>
    ): void {
        this.markerMovingState.set(false)
        if (this.markerPositionate) this.markerPositionate?.remove()
        const coords = lngLat ? lngLat : this.markerPositionate.getLngLat()
        let newTag: Record<string, string | number>

        if (tags) {
            newTag = { ...tags }
        } else {
            const configuredTags = this.tagsService.tags()
            const lastTagsUsed = this.tagsService
                .tags()
                .find((t) => t.id === this.tagsService.lastTagsUsedIds()[0])
            const defaultTag = lastTagsUsed ?? configuredTags[0]
            newTag = defaultTag ? { ...defaultTag.tags } : {}
        }

        const pt = point([coords.lng, coords.lat], {
            type: 'node',
            tags: newTag,
        }) as OsmGoFeature
        this.mode = 'Create'
        this.showModal({
            type: 'Create',
            geojson: pt,
            origineData: 'data_changed',
            openPrimaryTagModalOnStart: !tags,
        })
    }

    cancelNewMarker(): void {
        this.markerMovingState.set(false)
        this.markerPositionate.remove()
    }

    openModalWithNewPosition(): void {
        this.markerMoveMovingState.set(false)
        this.markerMove.remove()
        const geojson = this.markerMove.data
        const newLngLat = this.markerMove.getLngLat()
        geojson.geometry.coordinates = [newLngLat.lng, newLngLat.lat]
        const origineData = geojson.properties.changeType
            ? 'data_changed'
            : 'data'
        this.showModal({
            type: this.mode,
            geojson: geojson,
            newPosition: true,
            origineData: origineData,
        })
    }

    cancelNewPosition(): void {
        this.markerMoveMovingState.set(false)
        const geojson = this.markerMove.data
        const origineData = geojson.properties.changeType
            ? 'data_changed'
            : 'data'
        this.showModal({
            type: this.mode,
            geojson: geojson,
            origineData: origineData,
        })
        this.markerMove.remove()
    }

    createDomMoveMarker<T>(coord: LngLatLike, data: T): OsmGoMarker<T> {
        const el = document.createElement('div')
        el.className = 'moveMarkerIcon'
        const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat(
            coord
        ) as OsmGoMarker<T>
        marker.data = data
        return marker
    }

    resetDataMap(): void {
        this.redrawBbox(this.dataService.resetGeojsonBbox())
        this.redrawMarkers(this.dataService.resetGeojsonData())
    }

    getMapStyle(): Observable<StyleSpecification> {
        return this.http
            .get<StyleSpecification>('assets/mapStyle/brigthCustom.json')
            .pipe(
                map((maplibreStyle) => {
                    const baseUrl = this.document.location.origin
                    const spritesFullPath = `${baseUrl}/assets/mapStyle/sprites/sprites`

                    return { ...maplibreStyle, sprite: spritesFullPath }
                })
            )
    }

    getIconStyle(feature: OsmGoFeature): OsmGoFeature {
        feature = setIconStyle(feature, this.tagsService.tags())
        return feature
    }

    initMap(config: Config): void {
        this.getMapStyle().subscribe((mapStyle) => {
            const canvas = this.document.createElement('canvas')
            if (!canvas.getContext('webgl2')) {
                this.alertService.showAlert(
                    'WebGL 2 is required to display the map on this device.'
                )
                return
            }

            this.positionIsFollow = config.centerWhenGpsIsReady
            this.headingIsLocked = config.centerWhenGpsIsReady
            this.zone.runOutsideAngular(() => {
                this.map = new Map({
                    container: 'map',
                    style: mapStyle as StyleSpecification,
                    center: [config.lastView.lng, config.lastView.lat],
                    zoom: config.lastView.zoom,
                    bearing: config.lastView.bearing,
                    pitch: 0,
                    maxZoom: 22,
                    doubleClickZoom: false,
                    attributionControl: false,
                    dragRotate: true,
                    trackResize: false,
                    pitchWithRotate: false,
                    collectResourceTiming: false,
                })
                this.configService.setCurrentZoom(this.map.getZoom())

                this.map.addControl(new NavigationControl())

                this.attributionControl = new AttributionControl({
                    customAttribution: '',
                })

                this.map.addControl(this.attributionControl)

                const scale = new ScaleControl({
                    maxWidth: 160,
                    unit: 'metric',
                })
                this.map.addControl(scale)

                this.map.on('load', async () => {
                    this.mapIsLoaded()
                    return of(this.map)
                })

                this.map.on('move', (e) => {
                    this.mapMoveSubject.next()
                    if (this.markerMoving() || this.markerMoveMoving()) {
                        this.markerMoveSubject.next(this.map.getCenter())
                    }
                })

                this.map.on('moveend', () => {
                    this.setCenterInUrl()
                })

                this.map.on('zoom', (e) => {
                    const location = this.locationService.location()
                    if (this.layersAreLoaded && location) {
                        if (location.coords.accuracy) {
                            this.changeLocationRadius(
                                location.coords.accuracy,
                                false
                            )
                        }
                    }
                })

                const initStorageGeojson = this.dataService.geojson
                const initStorageGeojsonChanged =
                    this.dataService.geojsonChanged
                const missingMarker: string[] = []
                for (const feature of initStorageGeojson.features) {
                    const marker = feature.properties.marker
                    if (
                        !this.map.hasImage(marker) &&
                        !missingMarker.includes(marker)
                    ) {
                        missingMarker.push(marker)
                    }
                }
                for (const feature of initStorageGeojsonChanged.features) {
                    const marker = feature.properties.marker
                    if (
                        !this.map.hasImage(marker) &&
                        !missingMarker.includes(marker)
                    ) {
                        missingMarker.push(marker)
                    }
                }
                const t1 = new Date().getTime()
                this.addMissingIconsToMap(missingMarker)
                    .then((d) => {
                        console.log(
                            'addMissingIconsToMap INIT TIME',
                            new Date().getTime() - t1,
                            'count :',
                            missingMarker.length
                        )
                    })
                    .catch((err) => {
                        console.error(err)
                    })
                    .finally(() => {
                        this.bboxChanged$.subscribe((geojsonPolygon) => {
                            const mapSource = this.map.getSource(
                                'bbox'
                            ) as GeoJSONSource
                            mapSource.setData(geojsonPolygon)
                        })
                    })
            })
        })

        this.moveElement$.subscribe((data) => {
            if (!data.mode || !data.geojson) {
                return
            }
            this.mode = data.mode
            const geojson = data.geojson
            if (geojson.geometry.type !== 'Point') {
                return
            }
            const pointFeature = geojson as OsmGoFeature<Point>
            const coordinates = pointFeature.geometry.coordinates as LngLatLike
            this.map.setCenter(coordinates)
            this.markerMove = this.createDomMoveMarker(
                coordinates,
                pointFeature
            )
            this.markerMoveMovingState.set(true)
            this.markerMove.addTo(this.map)
            this.markerMove$.subscribe((center) => {
                this.markerMove.setLngLat(center)
            })
        })
    }

    setCenterInUrl(): void {
        const center = this.map.getCenter()
        const lng = Math.round(center.lng * 10000000) / 10000000
        const lat = Math.round(center.lat * 10000000) / 10000000
        const zoom = Math.round(this.map.getZoom() * 100) / 100
        const queryParams: Params = {
            center: `${lng},${lat}`,
            zoom: `${zoom}`,
            id: null,
            add: null,
        }

        this._ngZone.run(() => {
            this.router.navigate([], {
                replaceUrl: true,
                relativeTo: this.activatedRoute,
                queryParams,
                queryParamsHandling: 'merge',
            })
        })
    }

    getIconRotate(heading: number, mapBearing: number): number {
        heading = heading > 354 ? 0 : heading + 5
        mapBearing = mapBearing < 0 ? 360 + mapBearing : mapBearing
        let iconRotate = heading - mapBearing
        if (iconRotate >= 360) {
            iconRotate = iconRotate - 360
        } else if (iconRotate <= 0) {
            iconRotate = iconRotate + 360
        }
        return iconRotate
    }

    toogleMesureFilter(
        enable: boolean,
        layerName: string,
        value: number,
        _map: Map
    ): FilterSpecification | undefined {
        const rawFilter = cloneDeep(_map.getFilter(layerName))
        if (!Array.isArray(rawFilter)) return undefined
        const currentFilter: unknown[] = [...rawFilter]

        let measureFilterIndex: number | undefined
        for (let i = 1; i < currentFilter.length; i++) {
            if (this.isPropertyComparisonFilter(currentFilter[i], 'mesure')) {
                measureFilterIndex = i
            }
        }
        if (measureFilterIndex !== undefined && !enable) {
            currentFilter.splice(measureFilterIndex, 1)
            const filter = currentFilter as FilterSpecification
            _map.setFilter(layerName, filter)
            return filter
        } else if (enable) {
            currentFilter.push(['<', ['get', 'mesure'], value])
            const filter = currentFilter as FilterSpecification
            _map.setFilter(layerName, filter)
            return filter
        }
        return currentFilter as FilterSpecification
    }

    selectFeature(feature: MapGeoJSONFeature): void {
        const layer = feature['layer'].id
        let origineData: FeatureIdSource = 'data'
        if (
            [
                'label_changed',
                'marker_changed',
                'icon-change',
                'way_line_changed',
                'way_fill_changed',
            ].includes(layer)
        ) {
            origineData = 'data_changed'
        }

        const idFromMap = `${feature.properties.type}/${feature.properties.id}`
        const geojson = this.dataService.getFeatureById(idFromMap, origineData)
        if (!geojson) {
            console.error(`Feature ${idFromMap} was not found.`)
            return
        }

        if (origineData !== 'data_changed') {
            const queryParams: Params = {
                id: `${idFromMap}`,
                zoom: null,
                center: null,
            }
            this.router.navigate([], {
                replaceUrl: true,
                relativeTo: this.activatedRoute,
                queryParams,
                queryParamsHandling: 'merge',
            })
        }

        this.showModal({
            type: 'Read',
            geojson: geojson,
            origineData: origineData,
        })
    }

    showOldTagIcon(maxYearAgo: number): void {
        const OneYear = 31536000000
        const currentTime = new Date().getTime()

        const currentFilter = cloneDeep(this.map.getFilter('icon-old'))
        if (!Array.isArray(currentFilter)) return

        let oldTagFilterIndex: number | undefined
        for (let i = 1; i < currentFilter.length; i++) {
            const spec = currentFilter[i]
            if (this.isPropertyComparisonFilter(spec, 'time', '>')) {
                oldTagFilterIndex = i
            }
        }
        let newFilter: unknown[]
        if (oldTagFilterIndex !== undefined) {
            currentFilter[oldTagFilterIndex] = [
                '>',
                '' + (currentTime - OneYear * maxYearAgo),
                ['get', 'time'],
            ]
            newFilter = currentFilter
        } else {
            newFilter = [...currentFilter]
            const filter = [
                '>',
                currentTime - OneYear * maxYearAgo,
                ['get', 'time'],
            ]
            newFilter.push(filter)
        }

        this.map.setFilter('icon-old', newFilter as FilterSpecification)
        this.map.setLayoutProperty('icon-old', 'visibility', 'visible')
    }

    hideOldTagIcon(): void {
        this.map.setLayoutProperty('icon-old', 'visibility', 'none')
    }

    showFixmeIcon(): void {
        this.map.setLayoutProperty('icon-fixme', 'visibility', 'visible')
    }
    hideFixmeIcon(): void {
        this.map.setLayoutProperty('icon-fixme', 'visibility', 'none')
    }

    mapIsLoaded(): void {
        const minzoom = 14

        this.map.addSource('bbox', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })
        this.map.addSource('data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })
        this.map.addSource('data_changed', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })
        this.map.addSource('ways', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })
        this.map.addSource('ways_changed', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })
        this.map.addSource('location_circle', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        })

        this.redrawBbox(this.dataService.geojsonBbox)
        this.redrawChangedMarkers(this.dataService.geojsonChanged)
        this.redrawMarkers(this.dataService.geojson)

        this.map.addLayer({
            id: 'bboxLayer',
            type: 'line',
            source: 'bbox',
            paint: {
                'line-color': '#ea1212',
                'line-width': 5,
                'line-dasharray': [2, 2],
            },
        })

        this.map.addLayer({
            id: 'way_fill',
            type: 'fill',
            minzoom: minzoom,
            source: 'ways',
            paint: {
                'fill-color': { property: 'hexColor', type: 'identity' },
                'fill-opacity': 0.3,
            },
            filter: [
                'all',
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                [
                    'match',
                    ['geometry-type'],
                    ['Polygon', 'MultiPolygon'],
                    true,
                    false,
                ],
            ],
        })

        this.map.addLayer({
            id: 'way_line',
            type: 'line',
            source: 'ways',
            minzoom: minzoom,
            paint: {
                'line-color': { property: 'hexColor', type: 'identity' },
                'line-width': 4,
                'line-opacity': 0.7,
            },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            // Types are not correct for the match filter used in the next line.
            // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
            // prettier-ignore
            filter: [
                'all',
                [
                    'match',
                    ['geometry-type'],
                    ['LineString', 'MultiLineString'],
                    true,
                    false,
                ],
            ],
        })

        this.map.addLayer({
            id: 'way_fill_changed',
            type: 'fill',
            source: 'ways_changed',
            paint: {
                'fill-color': { property: 'hexColor', type: 'identity' },
                'fill-opacity': 0.3,
            },
            filter: [
                'all',
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                [
                    'match',
                    ['geometry-type'],
                    ['Polygon', 'MultiPolygon'],
                    true,
                    false,
                ],
            ],
        })

        this.map.addLayer({
            id: 'way_line_changed',
            type: 'line',
            source: 'ways_changed',
            paint: {
                'line-color': { property: 'hexColor', type: 'identity' },
                'line-width': 4,
                'line-opacity': 0.7,
            },
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            filter: [
                'all',
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                [
                    'match',
                    ['geometry-type'],
                    ['LineString', 'MultiLineString'],
                    true,
                    false,
                ],
            ],
        })

        this.map.addLayer({
            id: 'label',
            type: 'symbol',
            minzoom: 16.5,
            source: 'data',
            layout: {
                'icon-image': 'none',
                'icon-anchor': 'bottom',
                'text-field': '{_name}',
                'text-font': ['Roboto-Regular'],
                'text-allow-overlap': false,
                'text-size': 11,
                'text-offset': [0, 1],
            },
            paint: {
                'text-color': '#0a0a0a',
                'text-halo-color': 'rgba(255,255,255,1)',
                'text-halo-width': 2,
            },
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'label_changed',
            type: 'symbol',
            minzoom: 16.5,
            source: 'data_changed',
            layout: {
                'icon-image': 'none',
                'icon-anchor': 'bottom',
                'text-field': '{_name}',
                'text-font': ['Roboto-Regular'],
                'text-allow-overlap': false,
                'text-size': 11,
                'text-offset': [0, 1],
            },
            paint: {
                'text-color': '#0a0a0a',
                'text-halo-color': 'rgba(255,255,255,1)',
                'text-halo-width': 2,
            },
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'location_circle',
            type: 'circle',
            source: 'location_circle',
            layout: {},
            paint: {
                'circle-color': '#9bbcf2',
                'circle-opacity': 0.2,
                'circle-radius': 0,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#9bbcf2',
                'circle-stroke-opacity': 0.5,
                'circle-pitch-alignment': 'map',
                'circle-radius-transition': { duration: 0 },
            },
        })

        this.map.addLayer({
            id: 'location_user',
            type: 'symbol',
            source: 'location_circle',
            layout: {
                'icon-size': 0.5,
                'icon-image': 'location-without-orientation',
                'icon-ignore-placement': true,
                'icon-allow-overlap': true,
                'icon-pitch-alignment': 'map',
            },
        })

        this.map.addLayer({
            id: 'icon-old',
            type: 'symbol',
            source: 'data',
            minzoom: minzoom,
            layout: {
                'icon-image': 'Old',
                'icon-ignore-placement': true,
                'icon-offset': [-13, -12],
                visibility: 'none',
            },
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'icon-fixme',
            type: 'symbol',
            source: 'data',
            minzoom: minzoom,
            layout: {
                'icon-image': 'Fixme',
                'icon-ignore-placement': true,
                'icon-offset': [13, -12],
                visibility: 'none',
            },
            filter: ['all', ['any', ['has', 'fixme'], ['has', 'deprecated']]],
        })

        this.map.addLayer({
            id: 'marker',
            type: 'symbol',
            minzoom: minzoom,
            source: 'data',
            layout: getMarkerLayout(),
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'marker_changed',
            type: 'symbol',
            source: 'data_changed',
            minzoom: minzoom,
            layout: getMarkerLayout(),
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'icon-change',
            type: 'symbol',
            source: 'data_changed',
            minzoom: minzoom,
            layout: {
                'icon-image': '{changeType}',
                'icon-ignore-placement': true,
                'icon-offset': [0, -35],
            },
            filter: ['all'],
        })

        this.layersAreLoaded = true

        this.filterMakerByIds(this.tagsService.hiddenTagsIds())

        const configOldTagIcon = this.configService.getOldTagsIcon()
        if (configOldTagIcon.display) {
            this.showOldTagIcon(configOldTagIcon.year)
        }

        if (this.configService.getDisplayFixmeIcon()) {
            this.showFixmeIcon()
        }

        // Area is measured in square meters.
        this.toogleMesureFilter(
            this.configService.getFilterWayByArea(),
            'way_fill',
            5000,
            this.map
        )
        // Length is measured in kilometers.
        this.toogleMesureFilter(
            this.configService.getFilterWayByLength(),
            'way_line',
            0.2,
            this.map
        )

        this.map.on('click', async (e) => {
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: this.configService.selecableLayers,
            })
            if (!features.length) {
                return
            }

            if (
                !this.configService.platforms.includes('hybrid') &&
                window.navigator.vibrate
            ) {
                window.navigator.vibrate(50)
            } else {
                try {
                    await Haptics.impact({ style: ImpactStyle.Heavy })
                } catch {}
            }

            const uniqFeaturesById = uniqBy(
                features,
                (o) => o['properties']['id']
            )

            if (uniqFeaturesById.length > 1) {
                this.featureChoiceSubject.next(uniqFeaturesById)
            } else {
                this.selectFeature(uniqFeaturesById[0])
            }
        })

        this.map.on('touchmove', (e) => {
            this.headingIsLocked = false
            this.positionIsFollow = false
        })

        this.map.on('rotate', () => {
            const trueHeading =
                this.locationService.compassHeading().trueHeading
            if (
                trueHeading !== null &&
                (!this.configService.config().lockMapHeading ||
                    !this.headingIsLocked)
            ) {
                const iconRotate = this.getIconRotate(
                    trueHeading,
                    this.map.getBearing()
                )
                this.map.setLayoutProperty(
                    'location_user',
                    'icon-rotate',
                    iconRotate
                )
            }
        })

        this.map.on('zoom', () => {
            this.configService.setCurrentZoom(this.map.getZoom())
        })

        this.locationService.compassHeadingChanges$
            .pipe(
                filter((heading): heading is HeadingWithTrueHeading => {
                    if (heading.trueHeading === null) return false
                    return (
                        this.lastRenderedHeading === null ||
                        Math.abs(
                            heading.trueHeading - this.lastRenderedHeading
                        ) > 1
                    )
                }),
                throttleTime(100)
            )
            .subscribe((heading) => {
                if (this.lastRenderedHeading === null) {
                    this.map.setLayoutProperty(
                        'location_user',
                        'icon-image',
                        'location-with-orientation'
                    )
                }
                this.lastRenderedHeading = heading.trueHeading

                if (
                    this.configService.config().lockMapHeading &&
                    this.headingIsLocked
                ) {
                    this.map.rotateTo(heading.trueHeading)
                    this.map.setLayoutProperty(
                        'location_user',
                        'icon-rotate',
                        0
                    )
                } else {
                    const iconRotate = this.getIconRotate(
                        heading.trueHeading,
                        this.map.getBearing()
                    )

                    this.map.setLayoutProperty(
                        'location_user',
                        'icon-rotate',
                        iconRotate
                    )
                }
            })

        this.locationService.newLocation$.subscribe(
            (geojsonPos: FeatureCollection) => {
                if (geojsonPos.features && geojsonPos.features[0].properties) {
                    const coordinates = (
                        geojsonPos.features[0].geometry as Point
                    ).coordinates as LngLatLike
                    const locationSource = this.map.getSource(
                        'location_circle'
                    ) as GeoJSONSource
                    locationSource.setData(geojsonPos)

                    if (geojsonPos.features[0].properties?.accuracy) {
                        this.changeLocationRadius(
                            geojsonPos.features[0].properties?.accuracy,
                            true
                        )
                    }

                    if (
                        this.configService.config().followPosition &&
                        this.positionIsFollow
                    ) {
                        this.map.setCenter(coordinates)
                        if (this.isFirstPosition) {
                            this.map.setZoom(18)
                            this.isFirstPosition = false
                        }
                    }
                }
            }
        )

        // Location may be ready before the map finishes loading.
        if (this.locationService.gpsIsReady()) {
            this.locationService.publishCurrentLocation()
        }

        this.mapLoadedSubject.next()
    }

    async addMissingIconsToMap(iconsIds: string[]): Promise<void> {
        const pixelRatio = window.devicePixelRatio > 1 ? 2 : 1
        const promises: Array<Promise<{ blob: ImageBitmap; id: string }>> = []
        for (const iconId of iconsIds) {
            let iconParam: IconParameters
            const matchMarkerAndIcon = iconId.match(
                /^(circle|square|penta)-(#\w{6})-([\w-]+)$/
            )
            const matchMarkerOnly = iconId.match(
                /^(circle|square|penta)-(#\w{6})-$/
            )
            const matchShapeOnly = iconId.match(/^(circle|square|penta)-$/)

            if (matchMarkerAndIcon) {
                const [, shape, color, id] = matchMarkerAndIcon
                iconParam = { shape, color, id }
            } else if (matchMarkerOnly) {
                const [, shape, color] = matchMarkerOnly
                iconParam = { shape, color, id: 'maki-circle' }
            } else if (matchShapeOnly) {
                const [, shape] = matchShapeOnly
                iconParam = { shape, color: '#000000', id: 'maki-circle' }
            } else {
                iconParam = {
                    shape: 'circle',
                    color: '#000000',
                    id: 'maki-circle',
                }
                console.log('no match', iconId)
            }

            promises.push(this.generateIconFromSprite(iconParam))
        }

        const images = await Promise.all(promises)
        for (const image of images) {
            if (!this.map.hasImage(image.id)) {
                this.map.addImage(image.id, image.blob, { pixelRatio })
            }
        }
    }

    getCanvasFromSpriteId(spriteId: string): Promise<HTMLCanvasElement> {
        return new Promise((resolve, reject) => {
            const spriteParams = this.tagsService.jsonSprites()[spriteId]

            if (!spriteParams) {
                reject(
                    new Error(`Sprite parameters are missing for ${spriteId}.`)
                )
                return
            }
            const pxRatio = spriteParams.pixelRatio || 1
            const pathSprites =
                pxRatio === 1
                    ? `assets/mapStyle/sprites/sprites.png`
                    : `assets/mapStyle/sprites/sprites@2x.png`

            if (this.spritesCache) {
                const spriteImage = this.spritesCache
                const canvas = this.createCanvasFromSprite(
                    spriteImage,
                    spriteParams
                )
                resolve(canvas)
            } else {
                const spriteImage = new Image()
                spriteImage.onload = () => {
                    this.spritesCache = spriteImage
                    const canvas = this.createCanvasFromSprite(
                        spriteImage,
                        spriteParams
                    )
                    resolve(canvas)
                }
                spriteImage.onerror = (error) => {
                    reject(error)
                }
                spriteImage.src = pathSprites
            }
        })
    }

    private createCanvasFromSprite(
        spriteImage: HTMLImageElement,
        spriteParams: Sprite
    ): HTMLCanvasElement {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Unable to create a canvas context.')
        }
        const { x, y, width, height } = spriteParams
        canvas.width = width
        canvas.height = height
        ctx.drawImage(
            spriteImage,
            x,
            y,
            width,
            height,
            0,
            0,
            canvas.width,
            canvas.height
        )
        return canvas
    }

    combineCanvasMarkerAndIcon(
        canvasMarker: HTMLCanvasElement,
        canvasIcon: HTMLCanvasElement
    ): HTMLCanvasElement {
        const canvasCombined = document.createElement('canvas')
        canvasCombined.width = canvasMarker.width
        canvasCombined.height = canvasMarker.height

        const ctx = canvasCombined.getContext('2d')
        if (!ctx) {
            throw new Error('Unable to create a canvas context.')
        }
        ctx.drawImage(canvasMarker, 0, 0)
        ctx.drawImage(canvasIcon, 0, 0)
        return canvasCombined
    }

    async generateIconFromSprite(
        markerParam: IconParameters
    ): Promise<{ blob: ImageBitmap; id: string }> {
        const id = `${markerParam.shape}-${markerParam.color}-${markerParam.id}`
        const markerId = `${markerParam.shape}-${markerParam.color}`

        const canvasIcon = await this.getCanvasFromSpriteId(markerParam.id)
        const canvasMarker = await this.getCanvasFromSpriteId(markerId)

        const canvasCombined = this.combineCanvasMarkerAndIcon(
            canvasMarker,
            canvasIcon
        )

        return new Promise((resolve, reject) => {
            canvasCombined.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error(`Unable to render map icon ${id}.`))
                    return
                }
                try {
                    const imageBitmap = await createImageBitmap(blob)
                    resolve({ id, blob: imageBitmap })
                } catch (error) {
                    reject(error)
                }
            })
        })
    }

    private isPropertyMatchFilter(
        value: unknown,
        propertyName: string
    ): boolean {
        if (!Array.isArray(value) || value[0] !== 'match') return false
        const getter = value[1]
        return (
            Array.isArray(getter) &&
            getter[0] === 'get' &&
            getter[1] === propertyName
        )
    }

    private isPropertyComparisonFilter(
        value: unknown,
        propertyName: string,
        operator?: string
    ): boolean {
        if (!Array.isArray(value) || value.length !== 3) return false
        if (operator && value[0] !== operator) return false
        return value.some(
            (part) =>
                Array.isArray(part) &&
                part[0] === 'get' &&
                part[1] === propertyName
        )
    }
}
