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
import * as turf from '@turf/turf';
import { Feature, Geometry, Point, BBox } from '@turf/turf';
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
  isDisplayOrtho: boolean = false;


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

    public dataService: DataService,
    public tagsService: TagsService,
    public alertService: AlertService,
    public locationService: LocationService,
    public configService: ConfigService,
    private zone: NgZone,
    private http: Http) {
    
    this.eventDomMainReady.subscribe(mes => {
      mapboxgl.accessToken = 'pk.eyJ1IjoiZHozMTY0MjQiLCJhIjoiNzI3NmNkOTcyNWFlNGQxNzU2OTA1N2EzN2FkNWIwMTcifQ.NS8KWg47FzfLPlKY0JMNiQ';
            this.locationService.eventLocationIsReady.subscribe( data => {
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
  } //EOF constructor

  drawWaysPoly(geojson, source) {
    let features = geojson.features;
    let featuresWay = [];
    for (let i = 0; i < features.length; i++) {
      let feature = features[i];
      if (feature.properties.type !== 'node') {
        let featureWay = { 'type': 'Feature', 'properties': { 'hexColor': feature.properties.hexColor }, 'geometry': feature.properties.way_geometry };
        featuresWay.push(featureWay);
      }
    }

    this.map.getSource(source).setData({ "type": "FeatureCollection", "features": featuresWay });
  }

  getBbox() :BBox {
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

    let pointMin:Point = { "type": "Point", "coordinates": [lng_min, lat_min] };
    let pointMax:Point = { "type": "Point", "coordinates": [lng_max, lat_max] };
    var coordsMin = turf.destination(pointMin, marginBuffer / 1000, -135).geometry.coordinates;
    let coordsMax = turf.destination(pointMax, marginBuffer / 1000, 45).geometry.coordinates;

    let bbox :BBox = [coordsMin[0], coordsMin[1],coordsMax[0], coordsMax[1]]; // TODO : on est pas à 1m près
    return bbox;
  }

  resetNorth() {
    this.map.resetNorth();
  }


  displayIgnOrtho(isDisplay: boolean) {

    if (isDisplay) {
      this.map.addLayer({
        "id": "lyrOrthoIgn",
        "type": "raster",
        "source": "tmsIgn",
        "minzoom": 0
      }, 'bboxLayer');
      this.isDisplayOrtho = true;
    }
    else {
      this.map.removeLayer('lyrOrthoIgn')
      this.isDisplayOrtho = false;
    }
  }
  centerOnMyPosition() {
    this.map.setCenter(this.locationService.getCoordsPosition());
    if (this.configService.config.lockMapHeading) {
      this.headingIsLocked = true;
    }
    if (this.configService.config.followPosition) {
      this.positionIsFollow = true;
    }
  }

  setPitch(pitched: boolean) {
    if (this.configService.config.mapIsPiched == false) {
      this.map.setPitch(0);
    }
    else {
      this.map.setPitch(60);
    }
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
    let pt = turf.point([coords.lng, coords.lat], { type: 'node', tags: newTag });
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
        spritesFullPath = path + 'assets/mapStyle/sprites'
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
          trackResize: false,
          failIfMajorPerformanceCavea: false,
          pitch: (this.configService.config.mapIsPiched) ? 60 : 0,
          collectResourceTiming: false
        });


        this.map.addControl(new mapboxgl.NavigationControl());

        this.map.on('load', function () {
          that.mapIsLoaded();

        });

        this.map.on('move', (e) => {
          console.log(this.map.getCenter())
          console.log(this.map.getZoom())
          if (this.markerMoving || this.markerMoveMoving)
            this.eventMarkerMove.emit(this.map.getCenter());
        });

        // this.map.on('render',e => {
        //   console.log(e);
        // })
        
      })
    })

    let timer = Observable.timer(100, 100);

    let subscriptionTimer = timer.subscribe(t => {
      if (this.map) {
        this.map.resize();
      }
      if (document.getElementById('map').offsetWidth > 200) {
        subscriptionTimer.unsubscribe();
      }
    });



    /* SUBSCRIPTION */
    // la config est chargée
    this.configService.eventConfigIsLoaded.subscribe(conf => {
      this.setPitch(conf.mapIsPiched);
    });

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
      this.dataService.localStorage.get('geojson').then(data2 => {
        if (data2) {
          if (data2.features.length > 0){
            // Il y a des données stockées en mémoires...
            this.alertService.eventNewAlert.emit(data2.features.length + ' anciens objets chargés')
          }else {
            // L'utilisateur n'a pas de données stockées, on le guide pour en télécharger... Tooltip
            this.alertService.eventDisplayToolTipRefreshData.emit();
          }
            
          this.dataService.setGeojson(data2);
          this.eventMarkerReDraw.emit(data2);
        }
      });
    });
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
    this.map.addSource("location_point", { "type": "geojson", "data": { "type": "FeatureCollection", "features": [] } });

    //test Tile
    this.map.addSource('tmsIgn', {
      'type': 'raster',
      'tiles': ['https://wxs.ign.fr/pratique/geoportail/wmts?LAYER=ORTHOIMAGERY.ORTHOPHOTOS&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}'],
      'tileSize': 256,
      'maxzoom': 19
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
      "id": "location_circle", "type": "fill", "source": "location_circle",
      "layout": {},
      "paint": { "fill-color": '#A6A6FF', "fill-opacity": 0.3 }
    });
    this.map.addLayer({
      "id": "location_point", "type": "symbol", "source": "location_point",
      "layout": {
        "icon-image": "arrow-position", "icon-allow-overlap": true, "icon-ignore-placement": true,
        'icon-rotate': { "property": 'trueHeading', "type": 'identity' }
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


    //GPS
    if (this.locationService.gpsIsReady) {
      this.map.getSource('location_point').setData(this.locationService.getGeojsonPos())
      this.map.setCenter(this.locationService.getGeojsonPos().features[0].geometry.coordinates)
    }

    this.locationService.eventNewCompassHeading
      .subscribe(heading => {
      if (this.configService.config.lockMapHeading && this.headingIsLocked) { // on suit l'orientation, la map tourne
        this.map.rotateTo(heading.trueHeading);
        if (that.configService.config.mapIsPiched) {
          map.setLayoutProperty('location_point', 'icon-rotation-alignment', 'map');
          map.setLayoutProperty('location_point', 'icon-rotate', heading.trueHeading)
        } else { // plus  jolie en vu du dessus, icon toujour au nord, la carte tourne
          map.setLayoutProperty('location_point', 'icon-rotation-alignment', 'viewport');
          map.setLayoutProperty('location_point', 'icon-rotate', 0);
        }
      } else { // la map reste fixe, l'icone tourn
        map.setLayoutProperty('location_point', 'icon-rotation-alignment', 'map');
        map.setLayoutProperty('location_point', 'icon-rotate', heading.trueHeading)
      }
    });

    this.locationService.eventNewLocation.subscribe(geojsonPos => {
        // cercle indiquant la précision
        this.map.getSource('location_circle').setData(this.locationService.getGeoJSONCirclePosition())

      if (geojsonPos.features[0].properties) {
        this.map.getSource('location_point').setData(geojsonPos);
        if (this.configService.config.followPosition && this.positionIsFollow) {
          that.map.setCenter(geojsonPos.features[0].geometry.coordinates)
        }
      }
    })
  }

}
