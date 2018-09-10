import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DataService } from './data.service'
import { TagsService } from './tags.service'
import { AlertService } from './alert.service'
import { LocationService } from './location.service'
import { ConfigService } from './config.service'
import { Http } from '@angular/http';


import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/timer';

import {  destination, point, Point, BBox } from '@turf/turf';
declare var mapboxgl: any;


@Injectable()
export class MapService {

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
  isDisplaySatelliteBaseMap: boolean = false;

  domMarkerPosition: HTMLDivElement;
  arrowDirection: HTMLDivElement;
  markerLocation = undefined;
  layersAreLoaded = false;


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
  markersLayer = [];

  constructor(
    private _ngZone: NgZone,
    public dataService: DataService,
    public tagsService: TagsService,
    public alertService: AlertService,
    public locationService: LocationService,
    public configService: ConfigService,
    private zone: NgZone,
    private http: Http) {

    this.domMarkerPosition = document.createElement('div');
    this.domMarkerPosition.className = 'positionMarkersSize';

    this.arrowDirection = document.createElement('div');

    this.arrowDirection.className = 'positionMarkersSize locationMapIcon';
    this.domMarkerPosition.appendChild(this.arrowDirection);
    this.arrowDirection.style.transform = 'rotate(0deg)'

    this.eventDomMainReady.subscribe(mes => {
      mapboxgl.accessToken = 'pk.eyJ1IjoiZHozMTY0MjQiLCJhIjoiNzI3NmNkOTcyNWFlNGQxNzU2OTA1N2EzN2FkNWIwMTcifQ.NS8KWg47FzfLPlKY0JMNiQ';
      this.locationService.eventLocationIsReady.subscribe(data => { // flatmap ?
        this.map.setZoom(19);
      })
      this.initMap();
    })

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
        this.diplayInitToast()
      }

    })
  } //EOF constructor

  drawWaysPoly(geojson, source) {
    let features = geojson.features;
    let featuresWay = [];
    for (let i = 0; i < features.length; i++) {
      let feature = features[i];
      if (feature.properties.type !== 'node') {
        let featureWay = { 'type': 'Feature', 'properties': { 'hexColor': feature.properties.hexColor, 'mesure':feature.properties.mesure }, 'geometry': feature.properties.way_geometry };
        featuresWay.push(featureWay);
      }
    }

    this.map.getSource(source).setData({ "type": "FeatureCollection", "features": featuresWay });
  }


  /*
  On lui donne une distance en mètre, il nous retourne distance en pixel
  Fortement inspirer de : https://github.com/mapbox/mapbox-gl-js/blob/9ee69dd4a74a021d4a04a8a96a3e8f06062d633a/src/ui/control/scale_control.js#L87 
  */
  getPixelDistFromMeter(map, dist: number) {
    const y = map.getContainer().clientHeight / 2;
    const mapWidth = map.getContainer().clientWidth;

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
    const distWidth = getDistance(map.unproject([0, y]), map.unproject([mapWidth, y]));
    const pxPerMeter = mapWidth / distWidth;

    return Math.round(dist * pxPerMeter);
  };

  getBbox(): BBox {
    let marginBuffer = this.configService.getMapMarginBuffer(); // buffer en m

    let w = document.getElementById('map').offsetWidth;
    let h = document.getElementById('map').offsetHeight;
    let cUL = this.map.unproject([0, 0]).toArray();
    let cUR = this.map.unproject([w, 0]).toArray();
    let cLR = this.map.unproject([w, h]).toArray();
    let cLL = this.map.unproject([0, h]).toArray();

    let coordinates = [cUL, cUR, cLR, cLL, cUL];
    let lng_min = null;
    let lng_max = null;
    let lat_min = null;
    let lat_max = null;
    for (let i = 1; i < coordinates.length; i++) {
      if (!lng_min || coordinates[i][0] < lng_min)
        lng_min = coordinates[i][0];
      if (!lng_max || coordinates[i][0] > lng_max)
        lng_max = coordinates[i][0];
      if (!lat_min || coordinates[i][1] < lat_min)
        lat_min = coordinates[i][1];
      if (!lat_max || coordinates[i][1] > lat_max)
        lat_max = coordinates[i][1];
    }

    let pointMin: Point = { "type": "Point", "coordinates": [lng_min, lat_min] };
    let pointMax: Point = { "type": "Point", "coordinates": [lng_max, lat_max] };
    var coordsMin = destination(pointMin, marginBuffer / 1000, -135).geometry.coordinates;
    let coordsMax = destination(pointMax, marginBuffer / 1000, 45).geometry.coordinates;

    let bbox: BBox = [coordsMin[0], coordsMin[1], coordsMax[0], coordsMax[1]]; // TODO : on est pas à 1m près
    return bbox;
  }

  resetNorth() {
    this.map.resetNorth();
  }


  displaySatelliteBaseMap(sourceName ,isDisplay: boolean) {

    if (isDisplay) {
      this.map.addLayer({
        "id": "lyr-basemap-satellite",
        "type": "raster",
        "source": sourceName,
        "minzoom": 0
      }, 'bboxLayer');
      this.isDisplaySatelliteBaseMap = true;
    }
    else {
      this.map.removeLayer('lyr-basemap-satellite')
      this.isDisplaySatelliteBaseMap = false;
    }
  }
  centerOnMyPosition() {
    this.map.setCenter(this.locationService.getCoordsPosition());
    if (this.configService.config.lockMapHeading) {
      this.headingIsLocked = true;

    }
    if (this.configService.config.followPosition) {
      this.positionIsFollow = true;
      this.map.rotateTo(this.locationService.compassHeading.trueHeading);
      this.arrowDirection.setAttribute("style", "transform: rotate(0deg");
    }
  }
  changeLocationRadius(newRadius: number, transition: boolean = false): void {
    const pxRadius = this.getPixelDistFromMeter(this.map, newRadius);
    let duration = transition ? 300 : 0;
    this.map.setPaintProperty('location_circle', 'circle-radius-transition', { "duration": duration });
    this.map.setPaintProperty('location_circle', 'circle-radius', pxRadius);
  }


  // CREATE NEW MARKER
  eventMarkerMove = new EventEmitter();
  markerMoving = false; // le marker est en train d'être positionné
  markerPositionate;
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
    let coords = this.markerPositionate.getLngLat();
    let newTag = { name: '' };
    if (this.tagsService.getLastTagAdded()) { // on récupere le dernier tag créé si il existe
      let lastTag: any = this.tagsService.getLastTagAdded();
      newTag[lastTag.key] = lastTag.value;
    } else {
      newTag['shop'] = '*';
    }
    let pt = point([coords.lng, coords.lat], { type: 'node', tags: newTag });
    this.mode = 'Create';
    this.eventShowModal.emit({ type: 'Create', geojson: pt, origineData: null })
  }

  cancelNewMarker() {
    this.markerMoving = false;
    this.markerPositionate.remove();
  }


  openModalWithNewPosition() {
    this.markerMoveMoving = false;
    this.markerMove.remove();
    let geojson = this.markerMove.data;
    let newLngLat = this.markerMove.getLngLat();
    // on pousse les nouvelle coordonnées dans le geojson
    geojson.geometry.coordinates = [newLngLat.lng, newLngLat.lat];
    let origineData = (geojson.properties.changeType) ? 'data_changed' : 'data';
    this.eventShowModal.emit({ type: this.mode, geojson: geojson, newPosition: true, origineData: origineData });
  }

  cancelNewPosition() {
    this.markerMoveMoving = false;
    let geojson = this.markerMove.data;
    let origineData = (geojson.properties.changeType) ? 'data_changed' : 'data';
    this.eventShowModal.emit({ type: this.mode, geojson: geojson, origineData: origineData });
    this.markerMove.remove();
  }


  getBboxPolygon() {
    return JSON.parse(JSON.stringify(this.bboxPolygon));
  }

  createDomMoveMarker(coord: number[], data) {
    let el = document.createElement('div');
    el.className = 'extra-marker extra-marker-circle-black';
    let icon = document.createElement('i');
    icon.style.color = 'white';
    icon.className = 'fa fa-arrows';
    el.appendChild(icon);
    let marker = new mapboxgl.Marker(el, { offset: [0, -15] }).setLngLat(coord);
    marker.data = data;
    return marker;
  }

  resetDataMap() {
    this.eventNewBboxPolygon.emit(this.dataService.resetGeojsonBbox());
    this.eventMarkerReDraw.emit(this.dataService.resetGeojsonData());
  }




  private getMarkerShape(feature) {
    // rien a faire ici...
    feature.properties['_name'] = feature.properties.tags.name ? feature.properties.tags.name : '';

    if (feature.properties.type === 'node') {
      return 'circle'
    }
    else {
      if (feature.properties.way_geometry.type === 'LineString' || feature.properties.way_geometry.type === 'MultiLineString') {
        return 'penta'
      } else if (feature.properties.way_geometry.type === 'Polygon' || feature.properties.way_geometry.type === 'MultiPolygon') {
        return 'square'
      } else {
        return 'star';
      }
    }
  }

  getMapStyle(): Observable<any> {
    return this.http.get('assets/mapStyle/brigthCustom.json')
      .map(res => {
        let mapStyle = res.json();
        return mapStyle;
      });

  }

  getIconStyle(feature) {
    let listOfPrimaryKeys = this.tagsService.getListOfPrimaryKey();
    let primaryTag = this.tagsService.getPrimaryKeyOfObject(feature.properties.tags); // {k: "shop", v: "travel_agency"}
    feature.properties['primaryTag'] = primaryTag;
    if (listOfPrimaryKeys.indexOf(primaryTag.k) !== -1) { // c'est un objet à afficher
      let configMarker = this.tagsService.getConfigMarkerByKv(primaryTag.k, primaryTag.v);
      if (configMarker) { // OK

        feature.properties.icon = (configMarker.icon) ? configMarker.icon : ''
        feature.properties.marker = this.getMarkerShape(feature) + '-' + configMarker.markerColor + '-' + feature.properties.icon;
        feature.properties.hexColor = configMarker.markerColor;

      } else { // on ne connait pas la 'value', donc pas de config pour le marker 
        feature.properties.marker = this.getMarkerShape(feature) + '-#000000-';
        feature.properties.icon = 'mi-white-circle'
        feature.properties.hexColor = '#000000';
      }
    }
    return feature;
  }

  setIconStyle(FeatureCollection) {
    let features = FeatureCollection.features;
    for (let i = 0; i < features.length; i++) {
      let feature = features[i];
      this.getIconStyle(feature); // lent....
    }
    return FeatureCollection;
  }

  initMap() {

    let that = this
    this.getMapStyle().subscribe(mapStyle => { //tricks pour donner le chemin complet des sprites pour MapboxGL >= 0.27
      let path = window.location.href
      let spritesFullPath = 'mapStyle/sprites';
      if (window.location.protocol == 'http:' || window.location.protocol == 'https:') {
        // http://localhost:8100/ => http://localhost:8100/assets/mapStyle/sprites
        spritesFullPath = (path + 'assets/mapStyle/sprites').replace('index.html', '');
      }
      else {
        //file:///android_asset/www/index.html => file:///android_asset/www/assets/mapStyle/sprites
        spritesFullPath = path.replace('/index.html', '/assets/mapStyle/sprites')
      }
      mapStyle.sprite = spritesFullPath;

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
          trackResize: true,
          // failIfMajorPerformanceCavea: false,
          pitch: 0,
          pitchWithRotate: false,
          collectResourceTiming: false
        });


        this.map.addControl(new mapboxgl.NavigationControl());

        this.map.on('load', function () {
          that.mapIsLoaded();

        });

        this.map.on('move', (e) => {
          if (this.markerMoving || this.markerMoveMoving) {
            this.eventMarkerMove.emit(this.map.getCenter());
          }
        });

        this.map.on('zoom', (e) => {
          if (this.layersAreLoaded && this.locationService.location) {
            this.changeLocationRadius(this.locationService.location.coords.accuracy, false);
          }

        });
        // this.map.on('render',e => {
        //   console.log(e);
        // })

      })
    })

    /* SUBSCRIPTIONS */
    // un nouveau polygon!
    this.eventNewBboxPolygon.subscribe(geojsonPolygon => {
      this.map.getSource('bbox').setData(geojsonPolygon);
    });

    // un marker est à déplacer! 
    this.subscriptionMoveElement = this.eventMoveElement.subscribe(data => {
      this.mode = data.mode;
      let geojson = data.geojson;
      // on recupere le marker concerné
      let marker = null;
      for (let i = 0; i < this.markersLayer.length; i++) {
        let m = this.markersLayer[i];
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
    let data = this.dataService.getGeojson()
    if (data.features.length > 0) {
      // Il y a des données stockées en mémoires...
      this.alertService.eventNewAlert.emit(data.features.length + ' anciens objets chargés')
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
      iconRotate = iconRotate - 360
    } else if (iconRotate <= 0) {
      iconRotate = iconRotate + 360;
    }
    return iconRotate
  }

  toogleMesureFilter(enable:boolean, layerName:string, value:number, map){
    const currentFilter = map.getFilter(layerName);
    const unfiltered = currentFilter.filter(el => el[1] && el[1] !== "mesure");
    if (enable){
       let newFilter = [...unfiltered, ['<', 'mesure', value] ];
       map.setFilter(layerName, newFilter);
       return layerName;
    } else {
      map.setFilter(layerName, unfiltered);
      return unfiltered
    }
  }

  addDomMarkerPosition() {
    if (!this.markerLocation) {
      this.markerLocation = new mapboxgl.Marker(this.domMarkerPosition, { offset: [0, 0] }).setLngLat(this.locationService.getGeojsonPos().features[0].geometry.coordinates);
      this.markerLocation.addTo(this.map);

      //  Pour debugger sur le navigateur...
      //   let heading = 0;
      //  Observable.timer(500, 500).subscribe(t => {
      //   heading = heading > 349 ? 0 : heading + 10;
      //   this.domMarkerPosition.children[0].setAttribute("style", "transform: rotate("+ this.getIconRotate( heading, this.map.getBearing())+"deg")
      // })
    }


  }

  mapIsLoaded() {
    let map = this.map;
    let that = this;

    this.loadDataFromLocalStorage();
    let minzoom = 14;

    this.map.addSource("bbox", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });
    this.map.addSource("data", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });
    this.map.addSource("data_changed", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });
    this.map.addSource("ways", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });
    this.map.addSource("ways_changed", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });
    this.map.addSource("location_circle", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });

    //test Tile
    this.map.addSource('tmsIgn', {
      'type': 'raster',
      'tiles': ['https://wxs.ign.fr/pratique/geoportail/wmts?LAYER=ORTHOIMAGERY.ORTHOPHOTOS&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'],
      'tileSize': 256,
      'maxzoom': 19
    });
    this.map.addSource("mapbox-satellite", {
      "type": "raster",
      "url": "mapbox://mapbox.satellite",
      "tileSize": 256
  });

    this.map.addLayer({
      'id': 'bboxLayer', 'type': 'line', 'source': 'bbox',
      'paint': { 'line-color': '#088', 'line-width': 5 }
    });

    this.map.addLayer({
      "id": "way_fill", "type": "fill", "minzoom": minzoom, "source": "ways",
      'paint': { 'fill-color': { "property": 'hexColor', "type": 'identity' }, 'fill-opacity': 0.3 },
      "filter": ['all', ['==', '$type', 'Polygon']]
    });

    this.map.addLayer({
      "id": "way_line", "type": "line", "source": "ways", "minzoom": minzoom,
      "paint": {
        "line-color": { "property": 'hexColor', "type": 'identity' },
        "line-width": 4, 'line-opacity': 0.7
      },
      "layout": { "line-join": "round", "line-cap": "round" },
      "filter": ['all', ['==', '$type', 'LineString']]
    });

    this.map.addLayer({
      "id": "way_fill_changed", "type": "fill", "source": "ways_changed",
      'paint': { 'fill-color': { "property": 'hexColor', "type": 'identity' }, 'fill-opacity': 0.3 },
      "filter": ['all', ['==', '$type', 'Polygon']]
    });

    this.map.addLayer({
      "id": "way_line_changed", "type": "line", "source": "ways_changed",
      "paint": {
        "line-color": { "property": 'hexColor', "type": 'identity' },
        "line-width": 4, 'line-opacity': 0.7
      },
      "layout": { "line-join": "round", "line-cap": "round" },
      "filter": ['all', ['==', '$type', 'LineString']]
    });

    this.map.addLayer({
      "id": "label", "type": "symbol", "minzoom": 16.5, "source": "data",
      "layout": { "icon-image": "none", "icon-anchor": 'bottom', "text-field": "{_name}", "text-font": ["Roboto-Regular"], "text-allow-overlap": false, "text-size": 9, "text-offset": [0, 1] },
      "paint": { "text-color": "#888", "text-halo-color": "rgba(255,255,255,0.8)", "text-halo-width": 1 }
    });

    this.map.addLayer({
      "id": "label_changed", "type": "symbol", "minzoom": 16.5, "source": "data_changed",
      "layout": { "icon-image": "none", "icon-anchor": 'bottom', "text-field": "{_name}", "text-font": ["Roboto-Regular"], "text-allow-overlap": false, "text-size": 9, "text-offset": [0, 1] },
      "paint": { "text-color": "#888", "text-halo-color": "rgba(255,255,255,0.8)", "text-halo-width": 1 }
    });

    //location
    this.map.addLayer({
      "id": "location_circle", "type": "circle", "source": "location_circle",
      "layout": {},
      "paint": {
        "circle-color": '#9bbcf2', "circle-opacity": 0.2, "circle-radius": 0,
        'circle-stroke-width': 1, "circle-stroke-color": '#9bbcf2', 'circle-stroke-opacity': 0.5,
        'circle-radius-transition': { "duration": 0 }
      }

    });


    // defini le style du marker en arrière plan
    this.map.addLayer({
      "id": "marker", "type": "symbol", "minzoom": minzoom, "source": "data",
      "layout": { "icon-image": "{marker}", "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-offset": [0, -14] }
    });

    this.map.addLayer({
      "id": "marker_changed", "type": "symbol", "source": "data_changed",
      "layout": { "icon-image": "{marker}", "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-offset": [0, -14] }
    });

    this.map.addLayer({
      "id": "icon-change", "type": "symbol", "source": "data_changed",
      "layout": {
        "icon-image": "{changeType}", "icon-ignore-placement": true, "icon-offset": [0, -35]
      }
    });
    this.layersAreLoaded = true;

    // value en m²!
    this.toogleMesureFilter(this.configService.getFilterWayByArea(), 'way_fill', 5000, this.map);
    // value en km!
    this.toogleMesureFilter(this.configService.getFilterWayByLength(), 'way_line', 0.2, this.map);

    this.map.on('click', function (e) {
      let c = [[e.point.x - 8, e.point.y + 8], [e.point.x + 8, e.point.y + 18]];
      let features = map.queryRenderedFeatures(c, { layers: ['marker', 'marker_changed', 'label_changed', 'label', 'icon-change'] });
      if (!features.length) {
        return;
      }
      let feature = features[0];
      let layer = feature.layer.id;
      // Provenance de la donnée d'origine (data OU data_changed)
      let origineData = 'data';
      if (layer === 'label_changed' || layer === 'marker_changed' || layer === 'icon-change') {
        origineData = 'data_changed';
      }

      let geojson = that.dataService.getFeatureById(feature.properties.id, origineData);
      that.eventShowModal.emit({ type: 'Read', geojson: geojson, origineData: origineData });
    });

    this.map.on('touchmove', function (e) {
      that.headingIsLocked = false;
      that.positionIsFollow = false;
    });

    this.map.on('rotate', e => {
      if (this.configService.config.lockMapHeading && this.headingIsLocked) { // on suit l'orientation, la map tourne

      } else { // la map reste fixe, l'icon tourne
        const iconRotate = this.getIconRotate(this.locationService.compassHeading.trueHeading, this.map.getBearing())
        this.arrowDirection.setAttribute("style", "transform: rotate(" + iconRotate + "deg")
      }
    })

    this.map.on('zoom', function (e) {
      that._ngZone.run(() => { 
        that.configService.currentZoom = that.map.getZoom();
       });
    });

    this.locationService.eventNewCompassHeading
      .subscribe(heading => {
        if (this.configService.config.lockMapHeading && this.headingIsLocked) { // on suit l'orientation, la map tourne
          this.map.rotateTo(heading.trueHeading);
          // plus  jolie en vu du dessus, icon toujours au nord, la carte tourne
          this.arrowDirection.setAttribute("style", "transform: rotate(0deg")

        } else { // la map reste fixe, l'icon tourne

          const iconRotate = this.getIconRotate(heading.trueHeading, this.map.getBearing())
          this.arrowDirection.setAttribute("style", "transform: rotate(" + iconRotate + "deg")
        }
      });

    this.locationService.eventNewLocation.subscribe(geojsonPos => {
      if (this.locationService.headingIsDisable) {
        this.arrowDirection.className = 'positionMarkersSize locationMapIcon-wo-orientation';
      }
      this.addDomMarkerPosition();

      if (geojsonPos.features && geojsonPos.features[0].properties) {
        this.markerLocation.setLngLat(geojsonPos.features[0].geometry.coordinates)
        this.map.getSource('location_circle').setData(geojsonPos);
        this.changeLocationRadius(geojsonPos.features[0].properties.accuracy, true);

        if (this.configService.config.followPosition && this.positionIsFollow) {
          that.map.setCenter(geojsonPos.features[0].geometry.coordinates)
        }
      }
    })

    // La localisation était déjà ready avnt que la carte ne soit chargée
    if (this.locationService.gpsIsReady) {
      if (this.locationService.headingIsDisable) {
        this.arrowDirection.className = 'positionMarkersSize locationMapIcon-wo-orientation';
      }
      this.locationService.eventNewLocation.emit(this.locationService.getGeojsonPos())

    }
  }

}
