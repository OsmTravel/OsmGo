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
import { Config } from 'protractor';
import { of } from 'rxjs';

const { Haptics } = Plugins;
@Injectable({ providedIn: 'root' })
export class MapService {
  isFirstPosition = true;

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
    this.locationService.eventLocationIsReady.subscribe(data => { 
      if (this.map && this.configService.config.centerWhenGpsIsReady) {
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

    this.eventMapMove
      .pipe(
        debounceTime(700)
      )
      .subscribe( () => {
        let mapCenter = this.map.getCenter();
        let mapBearing = this.map.getBearing()
        let mapZoom = this.map.getZoom();
        const currentView = { lng: mapCenter.lng, lat: mapCenter.lat, zoom: mapZoom, bearing: mapBearing }
        this.configService.setLastView(currentView)
      })


  } // EOF constructor

  bboxPolygon;
  map;
  markerMove;
  markerMoveMoving = false;
  subscriptionMoveElement;
  subscriptionMarkerMove;
  mode = 'Update';
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
  eventMapIsLoaded = new EventEmitter();
  eventMarkerChangedReDraw = new EventEmitter();
  eventShowDialogMultiFeatures = new EventEmitter();
  markersLayer = [];


  // CREATE NEW MARKER
  eventMarkerMove = new EventEmitter();
  eventMapMove = new EventEmitter();
  markerMoving = false; // le marker est en train d'être positionné
  markerPositionate;
  markerMapboxUnknown = {};

  filters = {
    fixme: null,

  }

  loadUnknownMarker(factor) {
    const roundedFactor = factor > 1 ? 2 : 1
    this.map.loadImage(`/assets/mapStyle/unknown-marker/circle-unknown@${roundedFactor}X.png`, (error, image) => {
      this.markerMapboxUnknown['circle'] = image;
    })
    this.map.loadImage(`/assets/mapStyle/unknown-marker/penta-unknown@${roundedFactor}X.png`, (error, image) => {
      this.markerMapboxUnknown['penta'] = image;
    })
    this.map.loadImage(`/assets/mapStyle/unknown-marker/square-unknown@${roundedFactor}X.png`, (error, image) => {
      this.markerMapboxUnknown['square'] = image;
    })
  }

  
  filterMakerByIds(ids) {
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
    if (ids.length === 0){ // avoid :expected at least one branch label.
      ids = ['']
    }

    for (let layerId of layersIds) {
      const currentFilter = this.map.getFilter(layerId);
      const newConfigIdFilter = ["match", ["get", "configId"], [...ids], false, true];
      let newFilter = [];
  
        // currentFilter[0] === 'all
          let findedFilter = false
          for (let i = 1; i < currentFilter.length; i++) {
            if (currentFilter[i][0] === 'match' && currentFilter[i][1][1] === 'configId') {
              currentFilter[i] = newConfigIdFilter;
              newFilter = currentFilter;
              findedFilter = true;
              // break;
            }
          }

          if (!findedFilter) {
            newFilter = [...currentFilter, newConfigIdFilter]
          }
        
      this.map.setFilter(layerId, newFilter);
    }

  }


  drawWaysPoly(geojson, source) {
    const features = geojson.features;
    const featuresWay = [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature.properties.type !== 'node') {
        const featureWay = {
          'type': 'Feature',
          'properties': feature.properties,
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
    const currentZoom = this.map.getZoom()

    this.map.setCenter(this.locationService.getCoordsPosition());
    if (currentZoom < 17){
      this.map.setZoom(18)
    }
    
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
     
    if (this.tagsService.lastTagsUsedIds && this.tagsService.lastTagsUsedIds[0]) { // on récupere le dernier tag créé si il existe
      const lastTagsUsed = this.tagsService.tags.find( t => t.id === this.tagsService.lastTagsUsedIds[0])
      if (lastTagsUsed){
        newTag = { ...lastTagsUsed.tags}
      }
      else{
        newTag = { ...this.tagsService.tags[0].tags };
      }
      

    } else {
      newTag = { ...this.tagsService.tags[0].tags };
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



  initMap( config: Config) {
    
    this.getMapStyle().subscribe(mapStyle => {
      this.positionIsFollow = config.centerWhenGpsIsReady;
      this.headingIsLocked = config.centerWhenGpsIsReady;
      this.zone.runOutsideAngular(() => {
        this.map = new mapboxgl.Map({
          container: 'map',
          style: mapStyle,
          center: [config.lastView.lng, config.lastView.lat] ,
          zoom: config.lastView.zoom,
          bearing: config.lastView.bearing,
          pitch: 0,
          maxZoom: 22,
          doubleClickZoom: false,
          attributionControl: false,
          dragRotate: true,
          trackResize: false,
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
          return of(this.map)
        
        });

        this.map.on('move', (e) => {
          this.eventMapMove.emit();
          if (this.markerMoving || this.markerMoveMoving) {
            this.eventMarkerMove.emit(this.map.getCenter());
          }
        });

        this.map.on('movestart', (e) => {
          // this.configService.freezeMapRenderer = true;
        });

        this.map.on('moveend', (e) => {

          // this.configService.freezeMapRenderer = false;

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
    let currentFilter = _map.getFilter(layerName);
    let findIndex = null;
    for (let i = 1; i < currentFilter.length; i++) {
      if (currentFilter[i][1][1] == 'mesure') {
        findIndex = i;
      }
    }
    if (findIndex && !enable) { // delete filter
      currentFilter.splice(findIndex, 1);
      _map.setFilter(layerName, currentFilter);
      return currentFilter;
    } else if (enable) {
      currentFilter.push(['<', ['get', 'mesure'], value]);
      _map.setFilter(layerName, currentFilter);
      return currentFilter
    }
  }

  addDomMarkerPosition() {
    if (!this.markerLocation) {
      this.markerLocation = new mapboxgl.Marker(this.domMarkerPosition,
        { offset: [0, 0] })
        .setLngLat(this.locationService.getGeojsonPos().features[0].geometry.coordinates);
      this.markerLocation.addTo(this.map);

    }
  }
  selectFeature(feature) {
    const layer = feature['layer'].id;
    // Provenance de la donnée d'origine (data OU data_changed)
    let origineData = 'data';
    if ( ['label_changed','marker_changed','icon-change', 'way_line_changed', 'way_fill_changed'].includes(layer)) {
      origineData = 'data_changed';
    }

    const geojson = this.dataService.getFeatureById(feature['properties'].id, origineData);
    this.eventShowModal.emit({ type: 'Read', geojson: geojson, origineData: origineData });
  }


  showOldTagIcon(maxYearAgo: number) {
    const OneYear = 31536000000;
    const currentTime = new Date().getTime()

    let currentFilter = this.map.getFilter('icon-old');
    //  currentFilter.push( ['>', currentTime - (OneYear * maxYearAgo) , ['get', 'time'] ] );

    let findedIndex;
    for (let i = 1; i < currentFilter.length; i++){
      if (currentFilter[i].length == 3 && currentFilter[i][2] &&
        currentFilter[i][0] == '>' && currentFilter[i][2][1] === 'time' ){
          findedIndex = i;
        }
    }
    let newFilter;
    if (findedIndex){
      currentFilter[findedIndex] = ['>', currentTime - (OneYear * maxYearAgo), ['get', 'time']];
      newFilter = currentFilter;
    } else {
      newFilter = [...currentFilter,
        ['>', currentTime - (OneYear * maxYearAgo), ['get', 'time']]
        ];
    }

    this.map.setFilter('icon-old', newFilter);
    this.map.setLayoutProperty('icon-old', 'visibility', 'visible')

  }

  hideOldTagIcon() {
    this.map.setLayoutProperty('icon-old', 'visibility', 'none')
  }

  showFixmeIcon() {
    this.map.setLayoutProperty('icon-fixme', 'visibility', 'visible')
  }
  hideFixmeIcon() {
    this.map.setLayoutProperty('icon-fixme', 'visibility', 'none')
  }

  mapIsLoaded() {
    const minzoom = 14;

    this.map.addSource('bbox', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('data', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('data_changed', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('ways', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('ways_changed', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });
    this.map.addSource('location_circle', { 'type': 'geojson', 'data': { 'type': 'FeatureCollection', 'features': [] } });

    // this.loadDataFromLocalStorage();
    this.eventNewBboxPolygon.emit(this.dataService.geojsonBbox);
    this.eventMarkerChangedReDraw.emit(this.dataService.geojsonChanged);
    this.eventMarkerReDraw.emit(this.dataService.geojson);

    for (let bm of this.configService.baseMapSources) {
      this.map.addSource(bm.id, bm);
    }

    this.map.addLayer({
      'id': 'bboxLayer', 'type': 'line', 'source': 'bbox',
      'paint': { 'line-color': '#ea1212', 'line-width': 5, 
      'line-dasharray': {   "stops": [
        [14, [1,0] ],
        [14, [1,1] ]
      ] } 
      }
    });

    this.map.addLayer({
      'id': 'way_fill', 'type': 'fill', 'minzoom': minzoom, 'source': 'ways',
      'paint': { 'fill-color': { 'property': 'hexColor', 'type': 'identity' }, 'fill-opacity': 0.3 }
      // ,'filter': ['all']
      , 'filter': ['all', ['match', ["geometry-type"], ['Polygon', 'MultiPolygon' ], true, false]]
      
    });

    this.map.addLayer({
      'id': 'way_line', 'type': 'line', 'source': 'ways', 'minzoom': minzoom,
      'paint': {
        'line-color': { 'property': 'hexColor', 'type': 'identity' },
        'line-width': 4, 'line-opacity': 0.7
      },
      'layout': { 'line-join': 'round', 'line-cap': 'round' },
      'filter': ['all', ['match', ["geometry-type"], ['LineString', 'MultiLineString' ], true, false]]
    });

    this.map.addLayer({
      'id': 'way_fill_changed', 'type': 'fill', 'source': 'ways_changed',
      'paint': { 'fill-color': { 'property': 'hexColor', 'type': 'identity' }, 'fill-opacity': 0.3 },
      'filter': ['all', ['match', ["geometry-type"], ['Polygon', 'MultiPolygon' ], true, false]]
    });

    this.map.addLayer({
      'id': 'way_line_changed', 'type': 'line', 'source': 'ways_changed',
      'paint': {
        'line-color': { 'property': 'hexColor', 'type': 'identity' },
        'line-width': 4, 'line-opacity': 0.7
      },
      'layout': { 'line-join': 'round', 'line-cap': 'round' },
      'filter': ['all', ['match', ["geometry-type"], ['LineString', 'MultiLineString' ], true, false]]
    });

    this.map.addLayer({
      'id': 'label', 'type': 'symbol', 'minzoom': 16.5, 'source': 'data',
      'layout': {
        'icon-image': 'none', 'icon-anchor': 'bottom',
        'text-field': '{_name}', 'text-font': ['Roboto-Regular'], 'text-allow-overlap': false, 'text-size': 9, 'text-offset': [0, 1]
      },
      'paint': { 'text-color': '#888', 'text-halo-color': 'rgba(255,255,255,0.8)', 'text-halo-width': 1 },
      'filter': ['all']
    });

    this.map.addLayer({
      'id': 'label_changed', 'type': 'symbol', 'minzoom': 16.5, 'source': 'data_changed',
      'layout': {
        'icon-image': 'none', 'icon-anchor': 'bottom',
        'text-field': '{_name}', 'text-font': ['Roboto-Regular'], 'text-allow-overlap': false, 'text-size': 9, 'text-offset': [0, 1]
      },
      'paint': { 'text-color': '#888', 'text-halo-color': 'rgba(255,255,255,0.8)', 'text-halo-width': 1 },
      'filter': ['all']
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
      'id': 'icon-old', 'type': 'symbol', 'source': 'data', 'minzoom': minzoom,
      'layout': {
        'icon-image': 'Old', 'icon-ignore-placement': true, 'icon-offset': [-13, -12],
        'visibility': 'none'
      },
      'filter': ['all']
    });

    this.map.addLayer({
      'id': 'icon-fixme', 'type': 'symbol', 'source': 'data', 'minzoom': minzoom,
      'layout': {
        'icon-image': 'Fixme', 'icon-ignore-placement': true, 'icon-offset': [13, -12],
        'visibility': 'none'
      },
      'filter': ['all', ["any", ['has', 'fixme'], ['has', 'deprecated']]]

    });

    this.map.addLayer({
      'id': 'marker', 'type': 'symbol', 'minzoom': minzoom, 'source': 'data',
      'layout': { 'icon-image': '{marker}', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [0, -14] },
      'filter': ['all']
    });

    this.map.addLayer({
      'id': 'marker_changed', 'type': 'symbol', 'source': 'data_changed', 'minzoom': minzoom,
      'layout': { 'icon-image': '{marker}', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-offset': [0, -14] },
      'filter': ['all']
    });

    this.map.addLayer({
      'id': 'icon-change', 'type': 'symbol', 'source': 'data_changed', 'minzoom': minzoom,
      'layout': {
        'icon-image': '{changeType}', 'icon-ignore-placement': true, 'icon-offset': [0, -35]
      },
      'filter': ['all']
    });

    this.layersAreLoaded = true;

    this.filterMakerByIds(this.tagsService.hiddenTagsIds);

    let configOldTagIcon = this.configService.getOldTagsIcon();
    if (configOldTagIcon.display) {
      this.showOldTagIcon(configOldTagIcon.year)
    }

    if (this.configService.getDisplayFixmeIcon()) {
      this.showFixmeIcon();
    }

    // value en m²!
    this.toogleMesureFilter(this.configService.getFilterWayByArea(), 'way_fill', 5000, this.map);
    // value en km!
    this.toogleMesureFilter(this.configService.getFilterWayByLength(), 'way_line', 0.2, this.map);

    this.map.on('click', async (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: this.configService.selecableLayers });
      if (!features.length) {
        return;
      }

      if (!this.configService.platforms.includes('hybrid')) {
        window.navigator.vibrate(50);
      } else {

        Haptics.impact({
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
      const pixelRatio = window.devicePixelRatio > 1 ? 2 : 1;
      if (/^circle/.test(iconId)) {
        this.map.addImage(iconId, this.markerMapboxUnknown['circle'], { pixelRatio:pixelRatio });
      }
      if (/^penta/.test(iconId)) {
        this.map.addImage(iconId, this.markerMapboxUnknown['penta'], { pixelRatio: pixelRatio });
      }
      if (/^square/.test(iconId)) {
        this.map.addImage(iconId, this.markerMapboxUnknown['square'], { pixelRatio: pixelRatio });
      }
      // console.log('missingIcon:', iconId)

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
          this.map.setCenter(geojsonPos.features[0].geometry.coordinates);
          if (this.isFirstPosition){
            this.map.setZoom(18);
            this.isFirstPosition = false
          }
          
        }
      }
    });

    // La localisation était déjà ready avnt que la carte ne soit chargée 
    if (this.locationService.gpsIsReady) {
      this.locationService.eventNewLocation.emit(this.locationService.getGeojsonPos());
    }
  
    this.eventMapIsLoaded.emit()
  }

}
