import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { DataService } from './data.service';
import { TagsService } from './tags.service';
import { AlertService } from './alert.service';
import { LocationService } from './location.service';
import { ConfigService } from './config.service';
import { HttpClient } from '@angular/common/http';

import { debounceTime, throttle, throttleTime } from "rxjs/operators";
import { uniqBy, cloneDeep } from 'lodash';

import { destination, point, Point, BBox } from '@turf/turf';
import { AlertController } from '@ionic/angular';
// declare var mapboxgl: any;
import * as mapboxgl from 'mapbox-gl';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { AlertInput } from '@ionic/core';
import {
  Plugins,
  HapticsImpactStyle
} from '@capacitor/core';

import { setIconStyle } from "../../../scripts/osmToOsmgo/index.js";
import { TagConfig } from 'src/type';

const { Haptics } = Plugins;
@Injectable({ providedIn: 'root' })
export class MapService {

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

    this.domMarkerPosition = document.createElement('div');
    this.domMarkerPosition.className = 'positionMarkersSize';
    this.arrowDirection = document.createElement('div');

    this.arrowDirection.className = 'positionMarkersSize locationMapIcon-wo-orientation';
    this.domMarkerPosition.appendChild(this.arrowDirection);
    this.arrowDirection.style.transform = 'rotate(0deg)';
    
      mapboxgl.accessToken = 'pk.eyJ1IjoiZG9mIiwiYSI6IlZvQ3VNbXcifQ.8_mV5dw1jVkC9luc6kjTsA';
      this.locationService.eventLocationIsReady.subscribe(data => { // flatmap ?
        if (this.map) {
          this.map.setZoom(19);
        }

      });

    this.eventMarkerReDraw.subscribe(geojson => {
      if (geojson) {
        this.map.getSource('data').setData(geojson);
        this.drawWaysPoly(geojson, 'ways');
      }
    });

    this.eventMarkerChangedReDraw.subscribe(geojson => {
      if (geojson) {
        this.map.getSource('data_changed').setData(geojson);
        this.drawWaysPoly(geojson, 'ways_changed');
      }
    });

    this.configService.eventCloseGeolocPage.subscribe(e => {
      if (this.configService.geojsonIsLoadedFromCache && !this.configService.geolocPageIsOpen) {
        this.diplayInitToast();
      }

    });
  } // EOF constructor

  bboxPolygon;
  map;
  markerMove;
  markerMoveMoving = false;
  subscriptionMoveElement;
  subscriptionMarkerMove;
  mode = 'Update';
  loadingData = false;
  headingIsLocked = true;
  positionIsFollow = true;
  isDisplaySatelliteBaseMap = false;

  domMarkerPosition: HTMLDivElement;
  arrowDirection: HTMLDivElement;
  markerLocation = undefined;
  layersAreLoaded = false;

  markersLoaded = [];

  eventDomMainReady = new EventEmitter();
  eventCreateNewMap = new EventEmitter();
  eventNewBboxPolygon = new EventEmitter();
  eventMoveElement = new EventEmitter();
  eventShowModal = new EventEmitter();
  eventOsmElementUpdated = new EventEmitter();
  eventOsmElementDeleted = new EventEmitter();
  eventOsmElementCreated = new EventEmitter();
  eventMarkerReDraw = new EventEmitter();
  eventMarkerChangedReDraw = new EventEmitter();
  eventShowDialogMultiFeatures = new EventEmitter();
  markersLayer = [];


  // CREATE NEW MARKER
  eventMarkerMove = new EventEmitter();
  markerMoving = false; // le marker est en train d'être positionné
  markerPositionate;
  markerMapboxUnknown = {};

  loadUnknownMarker(factor){
        const roundedFactor = Math.round(factor)
        // this.map.addImage(iconId, image, { pixelRatio: Math.round(window.devicePixelRatio) });
          this.map.loadImage(`/assets/mapStyle/unknown-marker/circle-unknown@${roundedFactor}X.png`, (error, image) => {
            this.markerMapboxUnknown['circle']= image;
          })
          this.map.loadImage(`/assets/mapStyle/unknown-marker/penta-unknown@${roundedFactor}X.png`, (error, image) => {
            this.markerMapboxUnknown['penta']= image;
          })
          this.map.loadImage(`/assets/mapStyle/unknown-marker/square-unknown@${roundedFactor}X.png`, (error, image) => {
            this.markerMapboxUnknown['square']= image;
          })
  }

  drawWaysPoly(geojson, source) {
    const features = geojson.features;
    const featuresWay = [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature.properties.type !== 'node') {
        const featureWay = {
          'type': 'Feature',
          'properties': { 'hexColor': feature.properties.hexColor, 'mesure': feature.properties.mesure },
          'geometry': feature.properties.way_geometry
        };
        featuresWay.push(featureWay);
      }
    }

    this.map.getSource(source).setData({ 'type': 'FeatureCollection', 'features': featuresWay });
  }


  /*
  On lui donne une distance en mètre, il nous retourne distance en pixel
  Fortement inspirer de :
  https://github.com/mapbox/mapbox-gl-js/blob/9ee69dd4a74a021d4a04a8a96a3e8f06062d633a/src/ui/control/scale_control.js#L87
  */
  getPixelDistFromMeter(_map, dist: number) {
    const y = _map.getContainer().clientHeight / 2;
    const mapWidth = _map.getContainer().clientWidth;

    function getDistance(latlng1, latlng2) {
      const R = 6371000;
      const rad = Math.PI / 180,
        lat1 = latlng1.lat * rad,
        lat2 = latlng2.lat * rad,
        a = Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);
      const maxMeters = R * Math.acos(Math.min(a, 1));
      return maxMeters;
    }
    const distWidth = getDistance(_map.unproject([0, y]), _map.unproject([mapWidth, y]));
    const pxPerMeter = mapWidth / distWidth;

    return Math.round(dist * pxPerMeter);
  }

  getBbox(): BBox {
    const marginBuffer = this.configService.getMapMarginBuffer() || 50; // buffer en m
    const w = document.getElementById('map').offsetWidth;
    const h = document.getElementById('map').offsetHeight;
    const cUL = this.map.unproject([0, 0]).toArray();
    const cUR = this.map.unproject([w, 0]).toArray();
    const cLR = this.map.unproject([w, h]).toArray();
    const cLL = this.map.unproject([0, h]).toArray();

    const coordinates = [cUL, cUR, cLR, cLL, cUL];
    let lng_min = null;
    let lng_max = null;
    let lat_min = null;
    let lat_max = null;
    for (let i = 1; i < coordinates.length; i++) {
      if (!lng_min || coordinates[i][0] < lng_min) {
        lng_min = coordinates[i][0];
      }
      if (!lng_max || coordinates[i][0] > lng_max) {
        lng_max = coordinates[i][0];
      }
      if (!lat_min || coordinates[i][1] < lat_min) {
        lat_min = coordinates[i][1];
      }
      if (!lat_max || coordinates[i][1] > lat_max) {
        lat_max = coordinates[i][1];
      }
    }

    const pointMin: Point = { 'type': 'Point', 'coordinates': [lng_min, lat_min] };
    const pointMax: Point = { 'type': 'Point', 'coordinates': [lng_max, lat_max] };
    const coordsMin = destination(pointMin, marginBuffer / 1000, -135).geometry.coordinates;
    const coordsMax = destination(pointMax, marginBuffer / 1000, 45).geometry.coordinates;
    const bbox: BBox = [coordsMin[0], coordsMin[1], coordsMax[0], coordsMax[1]]; // TODO : on est pas à 1m près
    return bbox;
  }

  resetNorth() {
    this.map.resetNorth();
  }


  displaySatelliteBaseMap(sourceName, isDisplay: boolean) {
    if (!this.configService.baseMapSources.find(b => b.id === sourceName)) {
      this.configService.setBaseSourceId(this.configService.baseMapSources[0].id)
      sourceName = this.configService.baseMapSources[0].id;
    }

    if (isDisplay) {
      this.map.addLayer({
        'id': 'basemap',
        'type': 'raster',
        'source': sourceName,
        'minzoom': 0
      }, 'bboxLayer');
      this.isDisplaySatelliteBaseMap = true;
    } else {
      if (this.map.getLayer('basemap')) {
        this.map.removeLayer('basemap');
      }
      this.isDisplaySatelliteBaseMap = false;
    }
  }
  centerOnMyPosition() {
    this.map.setCenter(this.locationService.getCoordsPosition());
    if (this.configService.config.lockMapHeading) {
      this.headingIsLocked = true;
    }

    if (this.configService.config.followPosition) {
      if (this.locationService.compassHeading.trueHeading) {
        this.positionIsFollow = true;
        this.map.rotateTo(this.locationService.compassHeading.trueHeading);
        this.arrowDirection.setAttribute('style', 'transform: rotate(0deg');
      }
    }

  }
  changeLocationRadius(newRadius: number, transition: boolean = false): void {
    const pxRadius = this.getPixelDistFromMeter(this.map, newRadius);
    const duration = transition ? 300 : 0;
    this.map.setPaintProperty('location_circle', 'circle-radius-transition', { 'duration': duration });
    this.map.setPaintProperty('location_circle', 'circle-radius', pxRadius);
  }
  positionateMarker() {
    this.markerPositionate = this.createDomMoveMarker([this.map.getCenter().lng, this.map.getCenter().lat], '');
    this.markerMoving = true;
    this.markerPositionate.addTo(this.map);
    this.eventMarkerMove.subscribe(center => {
      this.markerPositionate.setLngLat(center);
    });
  }

  openModalOsm() {
    this.markerMoving = false;
    this.markerPositionate.remove();
    const coords = this.markerPositionate.getLngLat();
    let newTag;

    if (this.tagsService.lastTagsUsed && this.tagsService.lastTagsUsed[0]) { // on récupere le dernier tag créé si il existe
      newTag = {...this.tagsService.lastTagsUsed[0].tags}
      
    } else {
      newTag = {...this.tagsService.tags[0].tags};

    }
    const pt = point([coords.lng, coords.lat], { type: 'node', tags: newTag });
    this.mode = 'Create';
    this.eventShowModal.emit({ type: 'Create', geojson: pt, origineData: null });
  }

  cancelNewMarker() {
    this.markerMoving = false;
    this.markerPositionate.remove();
  }


  openModalWithNewPosition() {
    this.markerMoveMoving = false;
    this.markerMove.remove();
    const geojson = this.markerMove.data;
    const newLngLat = this.markerMove.getLngLat();
    // on pousse les nouvelle coordonnées dans le geojson
    geojson.geometry.coordinates = [newLngLat.lng, newLngLat.lat];
    const origineData = (geojson.properties.changeType) ? 'data_changed' : 'data';
    this.eventShowModal.emit({ type: this.mode, geojson: geojson, newPosition: true, origineData: origineData });
  }

  cancelNewPosition() {
    this.markerMoveMoving = false;
    const geojson = this.markerMove.data;
    const origineData = (geojson.properties.changeType) ? 'data_changed' : 'data';
    this.eventShowModal.emit({ type: this.mode, geojson: geojson, origineData: origineData });
    this.markerMove.remove();
  }


  getBboxPolygon() {
    return cloneDeep(this.bboxPolygon);
  }

  createDomMoveMarker(coord: number[], data) {
    const el = document.createElement('div');
    el.className = 'moveMarkerIcon';
    const marker = new mapboxgl.Marker(el, { offset: [0, -15] }).setLngLat(coord);
    marker.data = data;
    return marker;
  }

  resetDataMap() {
    this.eventNewBboxPolygon.emit(this.dataService.resetGeojsonBbox());
    this.eventMarkerReDraw.emit(this.dataService.resetGeojsonData());
  }

  getMapStyle() {
    return this.http.get('assets/mapStyle/brigthCustom.json')
      .pipe(
        map(mapboxStyle => {
          let spritesFullPath = `mapStyle/sprites/sprites`;
          // http://localhost:8100/assets/mapStyle/sprites/sprites.json
            const basePath = window.location.origin // path.split('#')[0];
            spritesFullPath = `${basePath}/assets/${spritesFullPath}`;
    
          mapboxStyle['sprite'] = spritesFullPath;
          return mapboxStyle
        }
        )
      );
  }

  getIconStyle(feature) {
    feature = setIconStyle(feature, this.tagsService.tags);
    return feature;
  }



  initMap() {

    const that = this;
    this.getMapStyle().subscribe(mapStyle => {

      that.zone.runOutsideAngular(() => {
        this.map = new mapboxgl.Map({
          container: 'map',
          style: mapStyle,
          center: [this.configService.init.lng, this.configService.init.lat],
          zoom: this.configService.init.zoom,
          maxZoom: 22,
          doubleClickZoom: false,
          attributionControl: false,
          dragRotate: true,
          trackResize: false,
          pitch: 0,
          pitchWithRotate: false,
          collectResourceTiming: false
        });


        this.map.addControl(new mapboxgl.NavigationControl());

        const scale = new mapboxgl.ScaleControl({
          maxWidth: 160,
          unit: 'metric'
        });
        this.map.addControl(scale);

        this.map.on('load', async () => {

          this.mapIsLoaded();
        });

        this.map.on('move', (e) => {
          if (this.markerMoving || this.markerMoveMoving) {
            this.eventMarkerMove.emit(this.map.getCenter());
          }
        });

        this.map.on('movestart', (e) => {
          this.configService.freezeMapRenderer = true;
        });

        this.map.on('moveend', (e) => {
    
          this.configService.freezeMapRenderer = false;

        });

        this.map.on('zoom', (e) => {
          if (this.layersAreLoaded && this.locationService.location) {
            this.changeLocationRadius(this.locationService.location.coords.accuracy, false);
          }
        });
        this.loadUnknownMarker(window.devicePixelRatio)

      });
    });

    /* SUBSCRIPTIONS */
    // un nouveau polygon!
    this.eventNewBboxPolygon.subscribe(geojsonPolygon => {
      this.map.getSource('bbox').setData(geojsonPolygon);
    });

    // un marker est à déplacer!
    this.subscriptionMoveElement = this.eventMoveElement.subscribe(data => {
      // this.markerMoving = true;
      this.mode = data.mode;
      const geojson = data.geojson;
      // on recupere le marker concerné
      let marker = null;
      for (let i = 0; i < this.markersLayer.length; i++) {
        const m = this.markersLayer[i];
        if (m.id === geojson.id) {
          marker = m;
          break;
        }
      }
      this.map.setCenter(geojson.geometry.coordinates);
      this.markerMove = this.createDomMoveMarker(geojson.geometry.coordinates, geojson);
      this.markerMoveMoving = true;
      this.markerMove.addTo(this.map);
      this.subscriptionMarkerMove = this.eventMarkerMove.subscribe(center => {
        this.markerMove.setLngLat(center);
      });
    });
  }

  loadDataFromLocalStorage() {
    this.dataService.localStorage.get('geojsonBbox').then(data => {
      if (data) {
        this.dataService.setGeojsonBbox(data);
        this.eventNewBboxPolygon.emit(data);
      }

    });

    this.dataService.localStorage.get('geojsonChanged').then(data => {
      if (data) {
        this.dataService.setGeojsonChanged(data);
        this.eventMarkerChangedReDraw.emit(data);
      }
    });

    this.dataService.localStorage.get('geojson').then(data => {
      this.configService.geojsonIsLoadedFromCache = true;
      if (data) {
        this.dataService.setGeojson(data);
        this.eventMarkerReDraw.emit(data);
        if (!this.configService.geolocPageIsOpen) {
          this.diplayInitToast();
        }
      }
    });
  }

  diplayInitToast() {
    const data = this.dataService.getGeojson();
    if (data.features.length > 0) {
      // Il y a des données stockées en mémoires... 
      this.alertService.eventNewAlert.emit(data.features.length + ' ' + this.translate.instant('MAIN.START_SNACK_ITEMS_IN_MEMORY'));
    } else {
      // L'utilisateur n'a pas de données stockées, on le guide pour en télécharger... Tooltip
      this.alertService.eventDisplayToolTipRefreshData.emit();
    }
  }

  getIconRotate(heading, mapBearing) {
    heading = heading > 354 ? 0 : heading + 5;
    mapBearing = mapBearing < 0 ? 360 + mapBearing : mapBearing;
    let iconRotate = heading - mapBearing;
    if (iconRotate >= 360) {
      iconRotate = iconRotate - 360;
    } else if (iconRotate <= 0) {
      iconRotate = iconRotate + 360;
    }
    return iconRotate;
  }

  toogleMesureFilter(enable: boolean, layerName: string, value: number, _map) {
    const currentFilter = _map.getFilter(layerName);
    const unfiltered = currentFilter.filter(el => el[1] && el[1] !== 'mesure');
    if (enable) {
      const newFilter = [...unfiltered, ['<', 'mesure', value]];
      _map.setFilter(layerName, newFilter);
      return layerName;
    } else {
      _map.setFilter(layerName, unfiltered);
      return unfiltered;
    }
  }

  addDomMarkerPosition() {
    if (!this.markerLocation) {
      this.markerLocation = new mapboxgl.Marker(this.domMarkerPosition,
        { offset: [0, 0] }).setLngLat(this.locationService.getGeojsonPos().features[0].geometry.coordinates);
      this.markerLocation.addTo(this.map);

    }
  }
  selectFeature(feature) {
    const layer = feature['layer'].id;
    // Provenance de la donnée d'origine (data OU data_changed)
    let origineData = 'data';
    if (layer === 'label_changed' || layer === 'marker_changed' || layer === 'icon-change') {
      origineData = 'data_changed';
    }

    const geojson = this.dataService.getFeatureById(feature['properties'].id, origineData);
    this.eventShowModal.emit({ type: 'Read', geojson: geojson, origineData: origineData });
  }


  showOldTagIcon(maxYearAgo: number){
    const OneYear = 31536000000;
    const currentTime = new Date().getTime()
    this.map.setFilter('icon-old', ['>', currentTime - (OneYear * maxYearAgo) , ['get', 'time'] ]);
    this.map.setLayoutProperty('icon-old', 'visibility', 'visible' )
  }

  hideOldTagIcon(){
    this.map.setLayoutProperty('icon-old', 'visibility', 'none' )
  }

  showFixmeIcon( ){
    this.map.setLayoutProperty('icon-fixme', 'visibility', 'visible' ) 
  }
  hideFixmeIcon( ){
    this.map.setLayoutProperty('icon-fixme', 'visibility', 'none' ) 
  }


  mapIsLoaded() {
    const that = this;

    this.loadDataFromLocalStorage();
    const minzoom = 14;

    this.map.addSource('bbox', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('data', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('data_changed', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('ways', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('ways_changed', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('location_circle', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });

    for (let bm of this.configService.baseMapSources) {
      this.map.addSource(bm.id, bm);
    }

    this.map.addLayer({
      'id': 'bboxLayer', 'type': 'line', 'source': 'bbox',
      'paint': { 'line-color': '#088', 'line-width': 5 }
    });

    this.map.addLayer({
      'id': 'way_fill', 'type': 'fill', 'minzoom': minzoom, 'source': 'ways',
      'paint': { 'fill-color': { 'property': 'hexColor', 'type': 'identity' }, 'fill-opacity': 0.3 },
      'filter': ['all', ['==', '$type', 'Polygon']]
    });

    this.map.addLayer({
      'id': 'way_line', 'type': 'line', 'source': 'ways', 'minzoom': minzoom,
      'paint': {
        'line-color': { 'property': 'hexColor', 'type': 'identity' },
        'line-width': 4, 'line-opacity': 0.7
      },
      'layout': { 'line-join': 'round', 'line-cap': 'round' },
      'filter': ['all', ['==', '$type', 'LineString']]
    });

    this.map.addLayer({
      'id': 'way_fill_changed', 'type': 'fill', 'source': 'ways_changed',
      'paint': { 'fill-color': { 'property': 'hexColor', 'type': 'identity' }, 'fill-opacity': 0.3 },
      'filter': ['all', ['==', '$type', 'Polygon']]
    });

    this.map.addLayer({
      'id': 'way_line_changed', 'type': 'line', 'source': 'ways_changed',
      'paint': {
        'line-color': { 'property': 'hexColor', 'type': 'identity' },
        'line-width': 4, 'line-opacity': 0.7
      },
      'layout': { 'line-join': 'round', 'line-cap': 'round' },
      'filter': ['all', ['==', '$type', 'LineString']]
    });

    this.map.addLayer({
      'id': 'label', 'type': 'symbol', 'minzoom': 16.5, 'source': 'data',
      'layout': {
        'icon-image': 'none', 'icon-anchor': 'bottom',
        'text-field': '{_name}', 'text-font': ['Roboto-Regular'], 'text-allow-overlap': false, 'text-size': 9, 'text-offset': [0, 1]
      },
      'paint': { 'text-color': '#888', 'text-halo-color': 'rgba(255,255,255,0.8)', 'text-halo-width': 1 }
    });

    this.map.addLayer({
      'id': 'label_changed', 'type': 'symbol', 'minzoom': 16.5, 'source': 'data_changed',
      'layout': {
        'icon-image': 'none', 'icon-anchor': 'bottom',
        'text-field': '{_name}', 'text-font': ['Roboto-Regular'], 'text-allow-overlap': false, 'text-size': 9, 'text-offset': [0, 1]
      },
      'paint': { 'text-color': '#888', 'text-halo-color': 'rgba(255,255,255,0.8)', 'text-halo-width': 1 }
    });

    // location
    this.map.addLayer({
      'id': 'location_circle', 'type': 'circle', 'source': 'location_circle',
      'layout': {},
      'paint': {
        'circle-color': '#9bbcf2', 'circle-opacity': 0.2, 'circle-radius': 0,
        'circle-stroke-width': 1, 'circle-stroke-color': '#9bbcf2', 'circle-stroke-opacity': 0.5,
        'circle-radius-transition': { 'duration': 0 }
      }

    });

    this.map.addLayer({
      'id': 'icon-old', 'type': 'symbol', 'source': 'data',
      'layout': {
        'icon-image': 'Old', 'icon-ignore-placement': true, 'icon-offset': [-13, -12],
        'visibility': 'none'
      }
    });

    this.map.addLayer({
      'id': 'icon-fixme', 'type': 'symbol', 'source': 'data',
      'layout': {
        'icon-image': 'Fixme', 'icon-ignore-placement': true, 'icon-offset': [13, -12],
        'visibility': 'none'
      },
      'filter':  [ "any", ['has','fixme'] , ['has', 'deprecated'] ]
      
    });

    this.map.addLayer({
      'id': 'marker', 'type': 'symbol', 'minzoom': minzoom, 'source': 'data',
      'layout': { 'icon-image': '{marker}', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [0, -14] }
    });

    this.map.addLayer({
      'id': 'marker_changed', 'type': 'symbol', 'source': 'data_changed',
      'layout': { 'icon-image': '{marker}', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [0, -14] }
    });

    this.map.addLayer({
      'id': 'icon-change', 'type': 'symbol', 'source': 'data_changed',
      'layout': {
        'icon-image': '{changeType}', 'icon-ignore-placement': true, 'icon-offset': [0, -35]
      }
    });
    
    this.layersAreLoaded = true;

    let configOldTagIcon = this.configService.getOldTagsIcon();
    if( configOldTagIcon.display){
      this.showOldTagIcon(configOldTagIcon.year)
    }
   
    if (this.configService.getDisplayFixmeIcon()){
        this.showFixmeIcon();
    }

    // value en m²!
    this.toogleMesureFilter(this.configService.getFilterWayByArea(), 'way_fill', 5000, this.map);
    // value en km!
    this.toogleMesureFilter(this.configService.getFilterWayByLength(), 'way_line', 0.2, this.map);



    this.map.on('click', async (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['marker', 'marker_changed', 'icon-change'] });
      if (!features.length) {
        return;
      }
      if (!this.configService.platforms.includes('hybrid')){
        window.navigator.vibrate(50);
      }else {
    
        Haptics.impact(  {
          style: HapticsImpactStyle.Heavy
        });
    
      }



      const uniqFeaturesById = uniqBy(features, o => o['properties']['id']);

      if (uniqFeaturesById.length > 1) {
        this.eventShowDialogMultiFeatures.emit(uniqFeaturesById);

      } else {
        this.selectFeature(uniqFeaturesById[0]);
      }
    });

    this.map.on('touchmove', e => {
      this.headingIsLocked = false;
      this.positionIsFollow = false;
    });

    this.map.on('rotate', async e => {

      if (this.locationService.compassHeading.trueHeading && (!this.configService.config.lockMapHeading || !this.headingIsLocked)) { // on suit l'orientation, la map tourne
        const iconRotate = this.getIconRotate(this.locationService.compassHeading.trueHeading, this.map.getBearing());
        this.arrowDirection.setAttribute('style', 'transform: rotate(' + iconRotate + 'deg');
      }
    });

    this.map.on('zoom', e => {
      this._ngZone.run(() => {
        this.configService.currentZoom = this.map.getZoom();
      });
    });


    this.map.on('styleimagemissing', async e => {
      // this.map.addImage(iconId, image, { pixelRatio: Math.round(window.devicePixelRatio) });
      const iconId = e.id;
      if( /^circle/.test(iconId)){
        console.log(this.markerMapboxUnknown['circle'])
          this.map.addImage(iconId, this.markerMapboxUnknown['circle'], { pixelRatio: Math.round(window.devicePixelRatio) });
      }
      if( /^penta/.test(iconId)){
        this.map.addImage(iconId, this.markerMapboxUnknown['penta'], { pixelRatio: Math.round(window.devicePixelRatio) });
      }
      if( /^square/.test(iconId)){
        this.map.addImage(iconId, this.markerMapboxUnknown['square'], { pixelRatio: Math.round(window.devicePixelRatio) });
      }
      console.log('missingIcon:', iconId)

    })



    this.locationService.eventNewCompassHeading
      .pipe(
        map((event: any) => {
          return event;
        }),
        throttleTime(100)
      )
      .subscribe(heading => {
        if (this.arrowDirection.className !== 'positionMarkersSize locationMapIcon') {
          this.arrowDirection.className = 'positionMarkersSize locationMapIcon'
        }

          if (this.configService.config.lockMapHeading && this.headingIsLocked) { // on suit l'orientation, la map tourne
          
            this.map.rotateTo(heading.trueHeading);
            // plus  jolie en vu du dessus, icon toujours au nord, la carte tourne
            this.arrowDirection.setAttribute('style', 'transform: rotate(0deg');

          } else { // la map reste fixe, l'icon tourne

            const iconRotate = this.getIconRotate(heading.trueHeading, this.map.getBearing());
            this.arrowDirection.setAttribute('style', 'transform: rotate(' + iconRotate + 'deg');
          }
   
      });

    this.locationService.eventNewLocation.subscribe(geojsonPos => {
      this.addDomMarkerPosition();

      if (geojsonPos.features && geojsonPos.features[0].properties) {
        this.markerLocation.setLngLat(geojsonPos.features[0].geometry.coordinates);
        this.map.getSource('location_circle').setData(geojsonPos);
        this.changeLocationRadius(geojsonPos.features[0].properties.accuracy, true);

        if (this.configService.config.followPosition && this.positionIsFollow) {
          that.map.setCenter(geojsonPos.features[0].geometry.coordinates);
        }
      }
    });

    // La localisation était déjà ready avnt que la carte ne soit chargée // TODO: forkjoin!
    if (this.locationService.gpsIsReady) {
      this.locationService.eventNewLocation.emit(this.locationService.getGeojsonPos());
    }
  }

}
