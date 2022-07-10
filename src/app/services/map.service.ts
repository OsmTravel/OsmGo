import { Injectable, EventEmitter, NgZone } from '@angular/core'
import { DataService } from '@services/data.service'
import { TagsService } from '@services/tags.service'
import { AlertService } from '@services/alert.service'
import { LocationService } from '@services/location.service'
import { ConfigService } from '@services/config.service'
import { HttpClient } from '@angular/common/http'

import { debounceTime, throttle, throttleTime } from 'rxjs/operators'
import { uniqBy, cloneDeep } from 'lodash'

import { destination, point, Point, BBox } from '@turf/turf'
import { AlertController } from '@ionic/angular'

import {
    AttributionControl,
    FilterSpecification,
    GeoJSONSource,
    LngLat,
    LngLatLike,
    Map,
    MapGeoJSONFeature,
    Marker,
    NavigationControl,
    RasterSourceSpecification,
    ScaleControl,
    StyleSpecification,
} from 'maplibre-gl'
import { TranslateService } from '@ngx-translate/core'
import { map } from 'rxjs/operators'
import { AlertInput } from '@ionic/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

import { setIconStyle } from '@scripts/osmToOsmgo/index.js'
import {
    FeatureIdSource,
    MapMode,
    OsmGoFeature,
    OsmGoFeatureCollection,
    OsmGoMarker,
    TagConfig,
} from '@osmgo/type'
import { Config } from 'protractor'
import { BehaviorSubject, Observable, of, Subject, Subscription } from 'rxjs'
import { FeatureCollection } from 'geojson'

@Injectable({ providedIn: 'root' })
export class MapService {
    isFirstPosition: boolean = true
    loadingData: boolean = false
    isProcessing: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

    constructor(
        private _ngZone: NgZone,
        public dataService: DataService,
        public tagsService: TagsService,
        public alertService: AlertService,
        public locationService: LocationService,
        public configService: ConfigService,
        private zone: NgZone,
        private alertCtrl: AlertController,
        private http: HttpClient,
        private translate: TranslateService
    ) {
        this.domMarkerPosition = document.createElement('div')
        this.domMarkerPosition.className = 'positionMarkersSize'
        this.arrowDirection = document.createElement('div')

        this.arrowDirection.className =
            'positionMarkersSize locationMapIcon-wo-orientation'
        this.domMarkerPosition.appendChild(this.arrowDirection)
        this.arrowDirection.style.transform = 'rotate(0deg)'

        this.locationService.eventLocationIsReady.subscribe((data) => {
            if (this.map && this.configService.config.centerWhenGpsIsReady) {
                this.map.setZoom(19)
            }
        })

        this.eventMarkerReDraw.subscribe((geojson?: OsmGoFeatureCollection) => {
            if (geojson) {
                const source = this.map.getSource('data') as GeoJSONSource
                source.setData(geojson)
                this.drawWaysPoly(geojson, 'ways')
            }
        })

        this.eventMarkerChangedReDraw.subscribe(
            (geojson?: OsmGoFeatureCollection) => {
                if (geojson) {
                    const source = this.map.getSource(
                        'data_changed'
                    ) as GeoJSONSource
                    source.setData(geojson)
                    this.drawWaysPoly(geojson, 'ways_changed')
                }
            }
        )

        this.eventMapMove.pipe(debounceTime(700)).subscribe(() => {
            let mapCenter = this.map.getCenter()
            let mapBearing = this.map.getBearing()
            let mapZoom = this.map.getZoom()
            const currentView = {
                lng: mapCenter.lng,
                lat: mapCenter.lat,
                zoom: mapZoom,
                bearing: mapBearing,
            }
            this.configService.setLastView(currentView)
        })
    } // EOF constructor

    bboxPolygon: OsmGoFeature
    map: Map
    markerMove: OsmGoMarker
    markerMoveMoving: boolean = false
    subscriptionMoveElement: Subscription
    subscriptionMarkerMove: Subscription
    mode: MapMode = 'Update'
    headingIsLocked: boolean = true
    positionIsFollow: boolean = true
    isDisplaySatelliteBaseMap: boolean = false

    domMarkerPosition: HTMLDivElement
    arrowDirection: HTMLDivElement
    markerLocation: OsmGoMarker = undefined
    layersAreLoaded: boolean = false

    markersLoaded = []

    eventDomMainReady = new EventEmitter()
    eventCreateNewMap = new EventEmitter()
    eventNewBboxPolygon = new EventEmitter<OsmGoFeatureCollection>()
    eventMoveElement = new EventEmitter()
    eventShowModal = new EventEmitter()
    eventOsmElementUpdated = new EventEmitter()
    eventOsmElementDeleted = new EventEmitter()
    eventOsmElementCreated = new EventEmitter()
    eventMarkerReDraw = new EventEmitter<OsmGoFeatureCollection>()
    eventMapIsLoaded = new EventEmitter<void>()
    eventMarkerChangedReDraw = new EventEmitter<OsmGoFeatureCollection>()
    eventShowDialogMultiFeatures = new EventEmitter<MapGeoJSONFeature[]>()
    markersLayer: OsmGoMarker[] = []

    attributionControl: AttributionControl

    // CREATE NEW MARKER
    eventMarkerMove = new EventEmitter()
    eventMapMove = new EventEmitter()
    markerMoving = false // le marker est en train d'être positionné
    markerPositionate: OsmGoMarker
    markerMaplibreUnknown = {}

    filters = {
        fixme: null,
    }

    setIsProcessing(isProcessing: boolean): void {
        this.isProcessing.next(isProcessing)
    }

    loadUnknownMarker(factor: number): void {
        const roundedFactor = factor > 1 ? 2 : 1
        this.map.loadImage(
            `/assets/mapStyle/unknown-marker/circle-unknown@${roundedFactor}X.png`,
            (error, image) => {
                this.markerMaplibreUnknown['circle'] = image
            }
        )
        this.map.loadImage(
            `/assets/mapStyle/unknown-marker/penta-unknown@${roundedFactor}X.png`,
            (error, image) => {
                this.markerMaplibreUnknown['penta'] = image
            }
        )
        this.map.loadImage(
            `/assets/mapStyle/unknown-marker/square-unknown@${roundedFactor}X.png`,
            (error, image) => {
                this.markerMaplibreUnknown['square'] = image
            }
        )
    }

    filterMakerByIds(ids: string[]): void {
        const layersIds = [
            'way_fill',
            'way_line',
            // 'way_fill_changed',
            // 'way_line_changed',
            'label',
            // 'label_changed',
            'icon-old',
            'icon-fixme',
            'marker',
            // 'marker_changed'
        ]
        if (ids.length === 0) {
            // avoid :expected at least one branch label.
            ids = ['']
        }

        for (let layerId of layersIds) {
            const currentFilter = this.map.getFilter(layerId)
            if (typeof currentFilter === 'undefined') {
                // FIXME @dotcs: Do something here
            }
            // @ts-expect-error
            // Types are not correct for the match filter used in the next line.
            // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
            // prettier-ignore
            const newConfigIdFilter: FilterSpecification = ['match', ['get', 'configId'], [...ids], false, true]
            let newFilter = []

            // currentFilter[0] === 'all
            let findedFilter = false
            for (let i = 1; i < currentFilter.length; i++) {
                if (
                    currentFilter[i][0] === 'match' &&
                    currentFilter[i][1][1] === 'configId'
                ) {
                    currentFilter[i] = newConfigIdFilter
                    newFilter = currentFilter
                    findedFilter = true
                    // break;
                }
            }

            if (!findedFilter) {
                newFilter = [...currentFilter, newConfigIdFilter]
            }

            this.map.setFilter(layerId, newFilter)
        }
    }

    drawWaysPoly(geojson: OsmGoFeatureCollection, source: string): void {
        const features = geojson.features
        const featuresWay = []
        for (let i = 0; i < features.length; i++) {
            const feature = features[i]
            if (feature.properties.type !== 'node') {
                const featureWay = {
                    type: 'Feature',
                    properties: feature.properties,
                    geometry: feature.properties.way_geometry,
                }
                featuresWay.push(featureWay)
            }
        }

        const mapSource = this.map.getSource(source) as GeoJSONSource
        mapSource.setData({ type: 'FeatureCollection', features: featuresWay })
    }

    /*
  On lui donne une distance en mètre, il nous retourne distance en pixel
  Fortement inspirer de :
  https://github.com/mapbox/mapbox-gl-js/blob/9ee69dd4a74a021d4a04a8a96a3e8f06062d633a/src/ui/control/scale_control.js#L87
  */
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
        const marginBuffer = this.configService.getMapMarginBuffer() || 50 // buffer en m
        const w = document.getElementById('map').offsetWidth
        const h = document.getElementById('map').offsetHeight
        const cUL = this.map.unproject([0, 0]).toArray()
        const cUR = this.map.unproject([w, 0]).toArray()
        const cLR = this.map.unproject([w, h]).toArray()
        const cLL = this.map.unproject([0, h]).toArray()

        const coordinates = [cUL, cUR, cLR, cLL, cUL]
        let lng_min = null
        let lng_max = null
        let lat_min = null
        let lat_max = null
        for (let i = 1; i < coordinates.length; i++) {
            if (!lng_min || coordinates[i][0] < lng_min) {
                lng_min = coordinates[i][0]
            }
            if (!lng_max || coordinates[i][0] > lng_max) {
                lng_max = coordinates[i][0]
            }
            if (!lat_min || coordinates[i][1] < lat_min) {
                lat_min = coordinates[i][1]
            }
            if (!lat_max || coordinates[i][1] > lat_max) {
                lat_max = coordinates[i][1]
            }
        }

        const pointMin: Point = {
            type: 'Point',
            coordinates: [lng_min, lat_min],
        }
        const pointMax: Point = {
            type: 'Point',
            coordinates: [lng_max, lat_max],
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
        ] // TODO : on est pas à 1m près
        return bbox
    }

    resetNorth(): void {
        this.map.resetNorth()
    }

    displaySatelliteBaseMap(baseMap, isDisplay: boolean): void {
        const bmSource: RasterSourceSpecification = {
            type: 'raster',
            tiles: baseMap.tiles,
            tileSize: 256,
            maxzoom: baseMap.max_zoom,
        }

        if (this.map.hasControl(this.attributionControl)) {
            this.map.removeControl(this.attributionControl)
        }

        if (this.configService.config.basemap !== baseMap.id) {
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

            this.isDisplaySatelliteBaseMap = true
        } else {
            this.attributionControl = new AttributionControl({
                customAttribution: '',
            })

            this.map.addControl(this.attributionControl)

            if (this.map.getLayer('basemap')) {
                this.map.removeLayer('basemap')
            }
            this.isDisplaySatelliteBaseMap = false
        }
    }
    centerOnMyPosition(): void {
        const currentZoom = this.map.getZoom()

        this.map.setCenter(this.locationService.getCoordsPosition())
        if (currentZoom < 17) {
            this.map.setZoom(18)
        }

        if (this.configService.config.lockMapHeading) {
            this.headingIsLocked = true
        }

        if (this.configService.config.followPosition) {
            this.positionIsFollow = true
            if (this.configService.config.lockMapHeading) {
                this.map.rotateTo(
                    this.locationService.compassHeading.trueHeading
                )
                this.arrowDirection.setAttribute(
                    'style',
                    'transform: rotate(0deg'
                )
            }
        }
    }
    changeLocationRadius(newRadius: number, transition: boolean = false): void {
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
        this.markerMoving = true
        this.markerPositionate.addTo(this.map)
        this.eventMarkerMove.subscribe((center) => {
            this.markerPositionate.setLngLat(center)
        })
    }

    openModalOsm(): void {
        this.markerMoving = false
        this.markerPositionate.remove()
        const coords = this.markerPositionate.getLngLat()
        let newTag

        if (
            this.tagsService.lastTagsUsedIds &&
            this.tagsService.lastTagsUsedIds[0]
        ) {
            // on récupere le dernier tag créé si il existe
            const lastTagsUsed = this.tagsService.tags.find(
                (t) => t.id === this.tagsService.lastTagsUsedIds[0]
            )
            if (lastTagsUsed) {
                newTag = { ...lastTagsUsed.tags }
            } else {
                newTag = { ...this.tagsService.tags[0].tags }
            }
        } else {
            newTag = { ...this.tagsService.tags[0].tags }
        }

        const pt = point([coords.lng, coords.lat], {
            type: 'node',
            tags: newTag,
        })
        this.mode = 'Create'
        this.eventShowModal.emit({
            type: 'Create',
            geojson: pt,
            origineData: null,
        })
    }

    cancelNewMarker(): void {
        this.markerMoving = false
        this.markerPositionate.remove()
    }

    openModalWithNewPosition(): void {
        this.markerMoveMoving = false
        this.markerMove.remove()
        const geojson = this.markerMove.data
        const newLngLat = this.markerMove.getLngLat()
        // on pousse les nouvelle coordonnées dans le geojson
        geojson.geometry.coordinates = [newLngLat.lng, newLngLat.lat]
        const origineData = geojson.properties.changeType
            ? 'data_changed'
            : 'data'
        this.eventShowModal.emit({
            type: this.mode,
            geojson: geojson,
            newPosition: true,
            origineData: origineData,
        })
    }

    cancelNewPosition(): void {
        this.markerMoveMoving = false
        const geojson = this.markerMove.data
        const origineData = geojson.properties.changeType
            ? 'data_changed'
            : 'data'
        this.eventShowModal.emit({
            type: this.mode,
            geojson: geojson,
            origineData: origineData,
        })
        this.markerMove.remove()
    }

    getBboxPolygon(): OsmGoFeature {
        return cloneDeep(this.bboxPolygon)
    }

    createDomMoveMarker(coord: LngLatLike, data: any): OsmGoMarker {
        const el = document.createElement('div')
        el.className = 'moveMarkerIcon'
        const marker = new Marker(el, { offset: [0, -15] }).setLngLat(
            coord
        ) as OsmGoMarker
        marker['data'] = data
        return marker
    }

    resetDataMap(): void {
        this.eventNewBboxPolygon.emit(this.dataService.resetGeojsonBbox())
        this.eventMarkerReDraw.emit(this.dataService.resetGeojsonData())
    }

    getMapStyle(): Observable<any> {
        return this.http.get('assets/mapStyle/brigthCustom.json').pipe(
            map((maplibreStyle) => {
                let spritesFullPath = `mapStyle/sprites/sprites`
                // http://localhost:8100/assets/mapStyle/sprites/sprites.json
                const basePath = window.location.origin // path.split('#')[0];
                spritesFullPath = `${basePath}/assets/${spritesFullPath}`

                maplibreStyle['sprite'] = spritesFullPath
                return maplibreStyle
            })
        )
    }

    getIconStyle(feature: OsmGoFeature): OsmGoFeature {
        feature = setIconStyle(feature, this.tagsService.tags)
        return feature
    }

    initMap(config: Config): void {
        this.getMapStyle().subscribe((mapStyle) => {
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

                this.map.addControl(new NavigationControl(null))

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
                    this.eventMapMove.emit()
                    if (this.markerMoving || this.markerMoveMoving) {
                        this.eventMarkerMove.emit(this.map.getCenter())
                    }
                })

                this.map.on('movestart', (e) => {
                    // this.configService.freezeMapRenderer = true;
                })

                this.map.on('moveend', (e) => {
                    // this.configService.freezeMapRenderer = false;
                })

                this.map.on('zoom', (e) => {
                    if (this.layersAreLoaded && this.locationService.location) {
                        this.changeLocationRadius(
                            this.locationService.location.coords.accuracy,
                            false
                        )
                    }
                })
                this.loadUnknownMarker(window.devicePixelRatio)
            })
        })

        /* SUBSCRIPTIONS */
        // un nouveau polygon!
        this.eventNewBboxPolygon.subscribe((geojsonPolygon) => {
            const mapSource = this.map.getSource('bbox') as GeoJSONSource
            mapSource.setData(geojsonPolygon)
        })

        // un marker est à déplacer!
        this.subscriptionMoveElement = this.eventMoveElement.subscribe(
            (data) => {
                // this.markerMoving = true;
                this.mode = data.mode
                const geojson = data.geojson
                // on recupere le marker concerné
                let marker = null
                for (let i = 0; i < this.markersLayer.length; i++) {
                    const m = this.markersLayer[i]
                    if (m.id === geojson.id) {
                        marker = m
                        break
                    }
                }
                this.map.setCenter(geojson.geometry.coordinates)
                this.markerMove = this.createDomMoveMarker(
                    geojson.geometry.coordinates,
                    geojson
                )
                this.markerMoveMoving = true
                this.markerMove.addTo(this.map)
                this.subscriptionMarkerMove = this.eventMarkerMove.subscribe(
                    (center) => {
                        this.markerMove.setLngLat(center)
                    }
                )
            }
        )
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
    ): FilterSpecification {
        let currentFilter = _map.getFilter(layerName)
        if (typeof currentFilter === 'undefined') {
            // FIXME: @dotcs add some error handling
        }
        let findIndex = null
        for (let i = 1; i < currentFilter.length; i++) {
            if (currentFilter[i][1][1] == 'mesure') {
                findIndex = i
            }
        }
        if (findIndex && !enable) {
            // delete filter
            currentFilter.splice(findIndex, 1)
            _map.setFilter(layerName, currentFilter)
            return currentFilter
        } else if (enable) {
            ;(currentFilter as FilterSpecification[]).push([
                '<',
                ['get', 'mesure'],
                value,
            ])
            _map.setFilter(layerName, currentFilter)
            return currentFilter
        }
    }

    addDomMarkerPosition(): void {
        if (!this.markerLocation) {
            this.markerLocation = new OsmGoMarker(this.domMarkerPosition, {
                offset: [0, 0],
            }).setLngLat(
                this.locationService.getGeojsonPos().features[0].geometry
                    .coordinates
            )
            // FIXME: @dotcs not all members are set (id, data)
            this.markerLocation.addTo(this.map)
        }
    }
    selectFeature(feature: MapGeoJSONFeature): void {
        const layer = feature['layer'].id
        // Provenance de la donnée d'origine (data OU data_changed)
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

        const geojson = this.dataService.getFeatureById(
            feature['properties'].id,
            origineData
        )
        this.eventShowModal.emit({
            type: 'Read',
            geojson: geojson,
            origineData: origineData,
        })
    }

    showOldTagIcon(maxYearAgo: number): void {
        const OneYear = 31536000000
        const currentTime = new Date().getTime()

        let currentFilter = this.map.getFilter('icon-old')
        if (typeof currentFilter === 'undefined') {
            // FIXME: @dotcs Add error handling
        }
        //  currentFilter.push( ['>', currentTime - (OneYear * maxYearAgo) , ['get', 'time'] ] );

        let findedIndex: number
        for (let i = 1; i < currentFilter.length; i++) {
            const spec = currentFilter[i] as FilterSpecification // TODO: @dotcs probably a dangerous typecast
            if (
                spec.length == 3 &&
                spec[2] &&
                spec[0] == '>' &&
                spec[2][1] === 'time'
            ) {
                findedIndex = i
            }
        }
        let newFilter: FilterSpecification
        if (findedIndex) {
            currentFilter[findedIndex] = [
                '>',
                '' + (currentTime - OneYear * maxYearAgo),
                ['get', 'time'],
            ]
            newFilter = currentFilter
        } else {
            newFilter = [...currentFilter] as FilterSpecification[]
            const filter = [
                '>',
                '' + (currentTime - OneYear * maxYearAgo),
                ['get', 'time'],
            ]
            newFilter.push(filter)
        }

        this.map.setFilter('icon-old', newFilter)
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

        // this.loadDataFromLocalStorage();
        this.eventNewBboxPolygon.emit(this.dataService.geojsonBbox)
        this.eventMarkerChangedReDraw.emit(this.dataService.geojsonChanged)
        this.eventMarkerReDraw.emit(this.dataService.geojson)

        this.map.addLayer({
            id: 'bboxLayer',
            type: 'line',
            source: 'bbox',
            paint: {
                'line-color': '#ea1212',
                'line-width': 5,
                // @ts-expect-error
                // Types can only deal with an array of numbers, not with more complex configurations.
                // See docs: https://maplibre.org/maplibre-gl-js-docs/style-spec/layers/#paint-line-line-dasharray
                'line-dasharray': {
                    stops: [
                        [14, [1, 0]],
                        [14, [1, 1]],
                    ],
                },
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
            // ,'filter': ['all']
            filter: [
                'all',
                // @ts-expect-error
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
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
            // @ts-expect-error
            // Types are not correct for the match filter used in the next line.
            // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
            // prettier-ignore
            filter: ['all', [ 'match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
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
                // @ts-expect-error
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
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
                // @ts-expect-error
                // Types are not correct for the match filter used in the next line.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898447098
                // prettier-ignore
                ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
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

        // location
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
                // @ts-expect-error
                // Currently the property 'circle-radius-transition' is missing in the typings.
                // See this discussion for details: https://github.com/DoFabien/OsmGo/pull/117#discussion_r898445988
                'circle-radius-transition': { duration: 0 },
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
            layout: {
                'icon-image': '{marker}',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-offset': [0, -14],
            },
            filter: ['all'],
        })

        this.map.addLayer({
            id: 'marker_changed',
            type: 'symbol',
            source: 'data_changed',
            minzoom: minzoom,
            layout: {
                'icon-image': '{marker}',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-offset': [0, -14],
            },
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

        this.filterMakerByIds(this.tagsService.hiddenTagsIds)

        let configOldTagIcon = this.configService.getOldTagsIcon()
        if (configOldTagIcon.display) {
            this.showOldTagIcon(configOldTagIcon.year)
        }

        if (this.configService.getDisplayFixmeIcon()) {
            this.showFixmeIcon()
        }

        // value en m²!
        this.toogleMesureFilter(
            this.configService.getFilterWayByArea(),
            'way_fill',
            5000,
            this.map
        )
        // value en km!
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
                this.eventShowDialogMultiFeatures.emit(uniqFeaturesById)
            } else {
                this.selectFeature(uniqFeaturesById[0])
            }
        })

        this.map.on('touchmove', (e) => {
            this.headingIsLocked = false
            this.positionIsFollow = false
        })

        this.map.on('rotate', async (e) => {
            if (
                this.locationService.compassHeading.trueHeading &&
                (!this.configService.config.lockMapHeading ||
                    !this.headingIsLocked)
            ) {
                // on suit l'orientation, la map tourne
                const iconRotate = this.getIconRotate(
                    this.locationService.compassHeading.trueHeading,
                    this.map.getBearing()
                )
                this.arrowDirection.setAttribute(
                    'style',
                    'transform: rotate(' + iconRotate + 'deg'
                )
            }
        })

        this.map.on('zoom', (e) => {
            this._ngZone.run(() => {
                this.configService.currentZoom = this.map.getZoom()
            })
        })

        this.map.on('styleimagemissing', async (e) => {
            // this.map.addImage(iconId, image, { pixelRatio: Math.round(window.devicePixelRatio) });
            const iconId = e.id
            const pixelRatio = window.devicePixelRatio > 1 ? 2 : 1
            if (/^circle/.test(iconId)) {
                this.map.addImage(
                    iconId,
                    this.markerMaplibreUnknown['circle'],
                    { pixelRatio: pixelRatio }
                )
            }
            if (/^penta/.test(iconId)) {
                this.map.addImage(iconId, this.markerMaplibreUnknown['penta'], {
                    pixelRatio: pixelRatio,
                })
            }
            if (/^square/.test(iconId)) {
                this.map.addImage(
                    iconId,
                    this.markerMaplibreUnknown['square'],
                    { pixelRatio: pixelRatio }
                )
            }
        })

        this.locationService.eventNewCompassHeading
            .pipe(
                map((event: any) => {
                    return event
                }),
                throttleTime(100)
            )
            .subscribe((heading) => {
                if (
                    this.arrowDirection.className !==
                    'positionMarkersSize locationMapIcon'
                ) {
                    this.arrowDirection.className =
                        'positionMarkersSize locationMapIcon'
                }

                if (
                    this.configService.config.lockMapHeading &&
                    this.headingIsLocked
                ) {
                    // on suit l'orientation, la map tourne

                    this.map.rotateTo(heading.trueHeading)
                    // plus  jolie en vu du dessus, icon toujours au nord, la carte tourne
                    this.arrowDirection.setAttribute(
                        'style',
                        'transform: rotate(0deg'
                    )
                } else {
                    // la map reste fixe, l'icon tourne

                    const iconRotate = this.getIconRotate(
                        heading.trueHeading,
                        this.map.getBearing()
                    )
                    this.arrowDirection.setAttribute(
                        'style',
                        'transform: rotate(' + iconRotate + 'deg'
                    )
                }
            })

        this.locationService.eventNewLocation.subscribe(
            (geojsonPos: FeatureCollection) => {
                this.addDomMarkerPosition()

                if (geojsonPos.features && geojsonPos.features[0].properties) {
                    const coordinates = (
                        geojsonPos.features[0].geometry as Point
                    ).coordinates as LngLatLike
                    this.markerLocation.setLngLat(coordinates)
                    const mapSource = this.map.getSource(
                        'location_circle'
                    ) as GeoJSONSource
                    mapSource.setData(geojsonPos)
                    this.changeLocationRadius(
                        geojsonPos.features[0].properties.accuracy,
                        true
                    )

                    if (
                        this.configService.config.followPosition &&
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

        // La localisation était déjà ready avnt que la carte ne soit chargée
        if (this.locationService.gpsIsReady) {
            this.locationService.eventNewLocation.emit(
                this.locationService.getGeojsonPos()
            )
        }

        this.eventMapIsLoaded.emit()
    }
}
