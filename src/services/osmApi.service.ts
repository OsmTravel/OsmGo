import { Injectable, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Http, Headers } from '@angular/http';
import { Storage } from '@ionic/storage';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/of';

import { MapService } from './map.service';
import { TagsService } from './tags.service';
import { DataService } from './data.service'
import { AlertService } from './alert.service';
import { ConfigService } from './config.service';


declare var osmtogeojson: any;
declare var $: any;
import * as turf from '@turf/turf';

@Injectable()
export class OsmApiService {

    isDevServer = false; // dev serveur
    urlsOsm = {
        prod: { "api": 'https://api.openstreetmap.org', "overpass": "https://overpass-api.de/api/interpreter" },
        dev: { "api": 'https://master.apis.dev.openstreetmap.org', "overpass": "" }
    }
    urlDataServer = 'http://osmgo-data.dogeo.fr/';

    
 
    user_info = { user: '', password: '', uid: '', display_name: '', connected: false };
    changeset = { id: '', last_changeset_activity: 0, created_at: 0, comment: '' };
    changeSetComment = 'Sortie avec Osm Go!';

    eventNewPoint = new EventEmitter();

    constructor(
        private http: Http,
        public mapService: MapService,
        public tagsService: TagsService,
        public dataService: DataService,
        public alertService: AlertService,
        public configService: ConfigService,
        private localStorage: Storage
    ) {
        this.localStorage.get('user_info').then(d => {
            if (d && d.connected) {
                this.user_info = d;
            } else {
                this.user_info = { user: '', password: '', uid: '', display_name: '', connected: false };
            }
        });

        this.localStorage.get('changeset').then(d => {
            if (d) {
                this.changeset = d;
            }
            else {
                this.changeset = { id: '', last_changeset_activity: 0, created_at: 0, comment: this.changeSetComment };
            }
        });
    }


    // retourne l'URL de l'API (dev ou prod)
    getUrlApi() {
        if (this.isDevServer) {
            return this.urlsOsm.dev.api;
        } else {
            return this.urlsOsm.prod.api;
        }
    }

    getChangesetComment() {
        return this.changeSetComment;
    };

    getUserInfo() {
        return this.user_info;
    };

    setUserInfo(_user_info) {
        this.user_info = { user: _user_info.user, password: _user_info.password, uid: _user_info.uid, display_name: _user_info.display_name, connected: true };
        this.localStorage.set('user_info', this.user_info);
    }

    resetUserInfo() {
        this.user_info = { user: '', password: '', uid: '', display_name: '', connected: false };
        this.localStorage.set('user_info', this.user_info);
    }

    // DETAIL DE L'UTILISATEUR 
    getUserDetail(_user, _password) {
        let url = this.getUrlApi() + '/api/0.6/user/details';
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(_user + ':' + _password));

        return this.http.get(url, { headers: headers })
            .map((res) => {
                let xml = new DOMParser().parseFromString(res.text(), 'text/xml');
                let x_user = xml.getElementsByTagName('user')[0];
                let uid = x_user.getAttribute('id');
                let display_name = x_user.getAttribute('display_name');
                let _userInfo = { user: _user, password: _password, uid: uid, display_name: display_name, connected: true }
                this.setUserInfo(_userInfo);
                return res;
            })
            .catch((error: any) => {
                return Observable.throw(error);
            });
    }
    // CHANGESET
    // Edits can only be added to a changeset as long as it is still open; a changeset can either be closed explicitly (see your editor's documentation), or it closes itself if no edits are added to it for a period of inactivity (currently one hour). The same user can have multiple active changesets at the same time. A changeset has a maximum capacity (currently 50,000 edits) and maximum lifetime (currently 24 hours)

    getChangeset() {
        return this.changeset;
    };

    setChangeset(_id: string, _created_at, _last_changeset_activity, _comment) { // alimente changeset + localstorage
        this.changeset = { id: _id, last_changeset_activity: _last_changeset_activity, created_at: _created_at, comment: _comment };  // to do => ajouter le serveur?
        this.localStorage.set('changeset', this.changeset);
    };

    updateChangesetLastActivity() {
        let time = Date.now();
        this.changeset.last_changeset_activity = time;
        this.localStorage.set('last_changeset_activity', time.toString());
    }

    /*id_CS = id du changeset*/
    getChangeSetStatus(id_CS) {
        let url = this.getUrlApi() + '/api/0.6/changeset/' + id_CS;

        return this.http.get(url)
            .map((res) => {
                let xml = new DOMParser().parseFromString(res.text(), 'text/xml');
                let open = xml.getElementsByTagName('changeset')[0].getAttribute('open');
                var user = xml.getElementsByTagName('changeset')[0].getAttribute('user');
                return { open: open, user: user };
            })
            .catch((error: any) => Observable.throw(error.json().error || 'Impossible d\'accédé au changeset'));
    }

    createOSMChangeSet(comment): Observable<any> {
        var url = this.getUrlApi() + '/api/0.6/changeset/create';
        var content_put = '<osm><changeset><tag k="created_by" v="' + this.configService.getAppVersion().appName + ' ' + this.configService.getAppVersion().appVersionNumber + '"/><tag k="comment" v="' + comment + '"/></changeset></osm>'; // this.getChangesetComment()
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(this.getUserInfo().user + ':' + this.getUserInfo().password));

        return this.http.put(url, content_put, { headers: headers })
            .map((res) => {
                this.setChangeset(res.text(), Date.now(), Date.now(), comment);
                return res.text();
            })
            .catch((error: any) => Observable.throw(error.json().error || 'Impossible de créer le changeset'));
    }



    // determine si le changset est valide, sinon on en crée un nouveau
    getValidChangset(_comments): Observable<any> {
        // si il n'existe pas
        if (this.getChangeset().id == null || this.getChangeset().id === '') {
            return this.createOSMChangeSet(_comments);
        }
        else if (_comments !== this.getChangeset().comment) { // un commentaire différent => nouveau ChangeSet
            return this.createOSMChangeSet(_comments);
        }
        else if ((Date.now() - this.getChangeset().last_changeset_activity) / 1000 > 3540 || // bientot une heure sans activité 
            (Date.now() - this.getChangeset().last_changeset_activity) / 1000 > 86360) {    // bientot > 24h 
            return this.createOSMChangeSet(_comments);
        } else {
            return Observable.of(this.getChangeset().id).map(CS => CS);
        }
    }

    // GEOJSON => XML osm
    geojson2OsmCreate(geojson, id_changeset) {
        let tags_json = geojson.properties.tags;
        var lng = geojson.geometry.coordinates[0];
        var lat = geojson.geometry.coordinates[1];
        var node_header = '<node changeset="' + id_changeset + '" lat="' + lat + '" lon="' + lng + '">';
        var tags_xml = '';
        for (var k in tags_json) {
            if (k !== '' && tags_json[k] !== '') {
                tags_xml += '<tag k="' + k.toLowerCase().trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" v="' + String(tags_json[k]).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"/>';
            }
        }
        var xml = '<osm>' + node_header + tags_xml + '</node></osm>';
        return (xml);
    }

    // convert feature to xml(osm)
    geojson2OsmUpdate(_feature, id_changeset) {
        var tags_json = _feature.properties.tags;
        var type_objet = _feature.properties.type;
        var version = _feature.properties.meta.version;
        var id = _feature.properties.id;

        if (type_objet === 'node') { // c'est un noeud, les coords sont dans le Geojson
            var lng = _feature.geometry.coordinates[0];
            var lat = _feature.geometry.coordinates[1];
            var node_header = '<node id="' + id + '" changeset="' + id_changeset + '" version="' + version + '" lat="' + lat + '" lon="' + lng + '">';
            var tags_xml = '';
            for (var k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += '<tag k="' + k.toLowerCase().trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" v="' + String(tags_json[k]).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"/>';

                }
            }
            var xml = '<osm>' + node_header + tags_xml + '</node></osm>';
            return (xml);
        } else if (type_objet === 'way') {
            var way_header = '<way id="' + id + '" changeset="' + id_changeset + '" version="' + version + '">';
            var tags_xml = '';
            for (var k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += '<tag k="' + k.toLowerCase().trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" v="' + String(tags_json[k]).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"/>';
                }
            }
            var nd_ref_xml = '';
            for (var i = 0; i < _feature.ndRefs.length; i++) {
                nd_ref_xml += '<nd ref="' + _feature.ndRefs[i] + '"/>';
            }
            var xml = '<osm>' + way_header + nd_ref_xml + tags_xml + '</way></osm>';
            return xml;
        } else if (type_objet === 'relation') {
            var relation_header = '<relation id="' + id + '" changeset="' + id_changeset + '" version="' + version + '">';
            var tags_xml = '';
            for (var k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += '<tag k="' + k.toLowerCase().trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" v="' + String(tags_json[k]).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"/>';
                }
            }
            var rel_ref_xml = '';
            for (var i = 0; i < _feature.relMembers.length; i++) {
                rel_ref_xml += '<member type="' + _feature.relMembers[i].type + '" role="' + _feature.relMembers[i].role + '" ref="' + _feature.relMembers[i].ref + '"/>'
            }
            var xml = '<osm>' + relation_header + tags_xml + rel_ref_xml + '</relation></osm>';
            return xml;
        }

    }


    /// CREATE NODE

    createOsmNode(_feature) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let d = new Date();
        let tmpId = 'tmp_' + d.getTime();
        feature.id = 'node/' + tmpId;
        feature.properties.id = tmpId;
        feature.properties['meta'] = { timestamp: 0, version: 0, user: '' };
        feature.properties.changeType = 'Create';
        feature.properties.originalData = null;
        this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
        // refresh changed only
        return Observable.of(_feature);

    }
    apiOsmCreateNode(_feature, changesetId) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let url = this.getUrlApi() + '/api/0.6/node/create';
        let content_put = this.geojson2OsmCreate(feature, changesetId);
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(this.getUserInfo().user + ':' + this.getUserInfo().password));
        return this.http.put(url, content_put, { headers: headers }).map(id => {
            return id.text();
        })
            .catch((error: any) => Observable.throw(error.json().error || 'Impossible de créer l\'élément'));;
    }

    // Update
    updateOsmElement(_feature, origineData) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let id = feature.id;
        if (origineData === 'data_changed') {// il a déjà été modifié == if (feature.properties.changeType)
            this.dataService.updateFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
        }

        else { //jamais été modifié, n'exite donc pas dans this.geojsonChanged mais dans le this.geojson
            feature.properties.changeType = 'Update';
            feature.properties.originalData = this.dataService.getFeatureById(feature.properties.id, 'data');
            this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            this.dataService.deleteFeatureFromGeojson(feature)
        }
        return Observable.of(id);
    }

    apiOsmUpdateOsmElement(_feature, changesetId) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let id = feature.id;

        let url = this.getUrlApi() + '/api/0.6/' + id;
        let content_put = this.geojson2OsmUpdate(feature, changesetId);
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(this.getUserInfo().user + ':' + this.getUserInfo().password));
        headers.append('Content-Type', 'text/xml');
        return this.http.put(url, content_put, { headers: headers }).map(data => {
            this.mapService.eventOsmElementUpdated.emit(feature);
            return data.text();
        })
    }

    // Delete
    deleteOsmElement(_feature) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let id = feature.id;

        if (feature.properties.changeType) { // il a déjà été modifié
            if (feature.properties.changeType === 'Create') { // il n'est pas sur le serveur, on le supprime des 2 geojson
                this.dataService.deleteFeatureFromGeojsonChanged(feature);
            }
            else if (feature.properties.changeType === 'Update') { // on reprend les données originales 
                this.dataService.updateFeatureToGeojson(feature.properties.originalData);
                feature.properties.changeType = 'Delete';
                this.dataService.updateFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            }
        }
        else { //jamais été modifié, n'exite donc pas dans this.geojsonChanged
            feature.properties.changeType = 'Delete';
            feature.properties.originalData = this.dataService.getFeatureById(feature.properties.id, 'data');
            this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            this.dataService.deleteFeatureFromGeojson(feature)
        }
        return Observable.of(id);
    }

    apiOsmDeleteOsmElement(_feature, changesetId) {
        let feature = JSON.parse(JSON.stringify(_feature));
        let id = feature.id;
        let content_delete = this.geojson2OsmUpdate(feature, changesetId);;
        let url = this.getUrlApi() + '/api/0.6/' + id;
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(this.getUserInfo().user + ':' + this.getUserInfo().password));
        return this.http.delete(url, { headers: headers, body: content_delete }).map(data => {
            this.mapService.eventOsmElementDeleted.emit(feature);
            return data.text();
        })
    }

    getUrlOverpassApi(bbox: turf.BBox) {

        let OPapiBbox = bbox[1] + ',' + bbox[0] + ',' + bbox[3] + ',' + bbox[2];
        let keys = this.tagsService.getListOfPrimaryKey();
        let queryContent: string = '';
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            queryContent = queryContent + 'node["' + key + '"](' + OPapiBbox + ');';
            queryContent = queryContent + 'way["' + key + '"](' + OPapiBbox + ');'
            queryContent = queryContent + 'relation["' + key + '"](' + OPapiBbox + ');'
        }
        let query = '[out:xml][timeout:25];(' + queryContent + ');out meta;>;out meta;'
        return query;
    }


    mergeNewOldData(newGeojson, oldGeojson, bbox_geojson) {
        let that = this;



        let workerGetStyle = new Worker("assets/workers/worker-getIconStyle.js");

        workerGetStyle.postMessage({
            tags: that.tagsService.getTags(),
            geojson: newGeojson,
            listOfPrimaryKeys: that.tagsService.getListOfPrimaryKey()
        });

        workerGetStyle.onmessage = function (newGeojsonStyled) {
            workerGetStyle.terminate()
            let workerMergeData = new Worker("assets/workers/worker-mergeData.js");

            workerMergeData.postMessage({
                newGeojson: newGeojsonStyled.data,
                oldGeojson: oldGeojson, 
                bbox_geojson: bbox_geojson,
                geojsonChanged: that.dataService.getGeojsonChanged()
            });

            workerMergeData.onmessage = function (mergedGeojson) {
                that.dataService.setGeojson(mergedGeojson.data)

                that.mapService.eventMarkerReDraw.emit(mergedGeojson.data);
                that.mapService.loadingData = false;
                workerMergeData.terminate();
            };
        }
    }
    setBbox(newBoboxFeature) {

        let resBbox;
        if (this.dataService.getGeojsonBbox().features.length == 0) {
            resBbox = { "type": "FeatureCollection", "features": [newBoboxFeature] };
            this.dataService.setGeojsonBbox(resBbox);

        } else {
            let oldBbox = this.dataService.getGeojsonBbox();

            let oldBboxFeature = JSON.parse(JSON.stringify(oldBbox.features[0]));

            let union = turf.union(newBoboxFeature, oldBboxFeature);
            resBbox = { "type": "FeatureCollection", "features": [union] }
            this.dataService.setGeojsonBbox(resBbox);
        }
        this.mapService.eventNewBboxPolygon.emit(resBbox);
    }

    getDataFromBbox(bbox: turf.BBox, useOverpassApi: boolean = false, delegateOsm2geojson: boolean = true) {
        let featureBbox = turf.bboxPolygon(bbox);
        for (let i = 0; i < featureBbox.geometry.coordinates[0].length; i++) {
            featureBbox.geometry.coordinates[0][i][0] = featureBbox.geometry.coordinates[0][i][0];
            featureBbox.geometry.coordinates[0][i][1] = featureBbox.geometry.coordinates[0][i][1];
        }

        let bboxArea = turf.area(featureBbox);
        if (delegateOsm2geojson) { //On delegue la conversion au serveur

            if (useOverpassApi || bboxArea > 100000) { // si la surface est > 10000m² => overpass api
                let url = this.urlDataServer + '/overpassApi?' +
                    'bbox=' + bbox.join(',') +
                    '&keys=' + this.tagsService.getListOfPrimaryKey().join();

                return this.http.get(url)
                    .map((res) => {
                        let geojson = res.json()
                        this.setBbox(featureBbox);
                        this.mergeNewOldData(geojson, this.dataService.getGeojson(), featureBbox);
                    })
                    .catch((error: any) => {
                        return Observable.throw('Impossible de télécharger les données (Overpass délégué)')
                    });

            }
            else {// api06
                let url = this.urlDataServer + '/api06?' +
                    'bbox=' + bbox.join(',') +
                    '&keys=' + this.tagsService.getListOfPrimaryKey().join();
                return this.http.get(url)
                    .map((res) => {
                        let geojson = res.json()
                        this.setBbox(featureBbox);
                        this.mergeNewOldData(geojson, this.dataService.getGeojson(), featureBbox);
                    })
                    .catch((error: any) => Observable.throw(error.json().error || 'Impossible de télécharger les données (api06)'));

            }
        }


        else { // on ne delegue pas au serveur
            if (useOverpassApi || bboxArea > 100000) { // si la surface est > 10000m² => overpass api
                let urlOverpassApi = 'http://overpass-api.de/api/interpreter';
                return this.http.post(urlOverpassApi, this.getUrlOverpassApi(bbox))
                    .map((res) => {
                        this.setBbox(featureBbox);
                        this.mergeNewOldData(this.xmlOsmToFormatedGeojson(res), this.dataService.getGeojson(), featureBbox);
                    })
                    .catch((error: any) => Observable.throw(error.json().error || 'Impossible de télécharger les données (overpassApi)'));
            }
            else {
                let url = this.getUrlApi() + '/api/0.6/map?bbox=' + bbox.join(',');

                return this.http.get(url)
                    .map((res) => {
                        this.setBbox(featureBbox);
                        this.mergeNewOldData(this.xmlOsmToFormatedGeojson(res), this.dataService.getGeojson(), featureBbox);
                    })
                    .catch((error: any) => Observable.throw(error.json().error || 'Impossible de télécharger les données (api06)'));
            }
        }
    }

    /* ne garde que les relations complètes (=> web worker?) (côté serveur?)*/
    private filterFeatures(features) {
        let filterFeatures = [];
        for (let i = 0; i < features.length; i++) {
            let feature = features[i];
            if (!feature.properties.tainted) { // !relation incomplete
                let primaryTag = this.tagsService.getPrimaryKeyOfObject(feature.properties.tags);
                if (primaryTag) { //tag interessant
                    feature.properties['primaryTag'] = primaryTag;
                    filterFeatures.push(feature);
                }
            }
        }
        return filterFeatures;
    }

    private xmlOsmToFormatedGeojson(res) {
        let xml = new DOMParser().parseFromString(res.text(), 'text/xml');
        let geojson = osmtogeojson(xml).geojson;
        geojson.features = this.filterFeatures(geojson.features)

        let featuresWayToPoint = this.wayToPoint(geojson);
        return this.mapService.setIconStyle((featuresWayToPoint));
    }

    // => web workers? effectué coté serveur
    private wayToPoint(FeatureCollection) {
        let features = FeatureCollection.features;
        for (let i = 0; i < features.length; i++) {

            let feature = features[i];
            if (feature.geometry) {
                if (feature.geometry.type !== 'Point') {

                    // on stocke la géométrie d'origine dans .way_geometry
                    feature.properties.way_geometry = JSON.parse(JSON.stringify(feature.geometry));
                    let geom;
                    switch (feature.geometry.type) {
                        case 'Polygon':
                            geom = turf.polygon(feature.geometry.coordinates);
                            break;
                        case 'MultiPolygon':
                            geom = turf.multiPolygon(feature.geometry.coordinates);
                            break;
                        case 'LineString':
                            geom = turf.lineString(feature.geometry.coordinates);
                            break;
                        case 'MultiLineString':
                            geom = turf.multiLineString(feature.geometry.coordinates);
                            break;
                    }

                    if (geom) {
                        feature.geometry.coordinates = turf.pointOnSurface(geom).geometry.coordinates;
                        feature.geometry.type = 'Point';
                    }
                }
            }
        }
        return FeatureCollection;
    }
} // EOF Services