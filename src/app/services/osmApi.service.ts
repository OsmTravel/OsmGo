import { Injectable, EventEmitter } from '@angular/core';
import { Observable, throwError, of, from } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';


import { MapService } from './map.service';
import { TagsService } from './tags.service';
import { DataService } from './data.service';
import { AlertService } from './alert.service';
import { ConfigService } from './config.service';
import * as _ from 'lodash';



import bboxPolygon  from '@turf/bbox-polygon'

@Injectable({ providedIn: 'root' })
export class OsmApiService {

    isDevServer = true;
    urlsOsm = {
        prod: { 'api': 'https://api.openstreetmap.org' },
        dev: { 'api': 'https://master.apis.dev.openstreetmap.org' }
    };



    user_info = { user: '', password: '', uid: '', display_name: '', connected: false };
    changeset = { id: '', last_changeset_activity: 0, created_at: 0, comment: '' };

    eventNewPoint = new EventEmitter();

    constructor(
        private http: HttpClient,
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
            } else {
                this.changeset = { id: '', last_changeset_activity: 0, created_at: 0, comment: this.configService.getChangeSetComment() };
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


    getUserInfo() {
        return this.user_info;
    }

    setUserInfo(_user_info) {
        this.user_info = {
            user: _user_info.user,
            password: _user_info.password,
            uid: _user_info.uid,
            display_name: _user_info.display_name,
            connected: true
        };
        this.localStorage.set('user_info', this.user_info);
    }

    resetUserInfo() {
        this.user_info = { user: '', password: '', uid: '', display_name: '', connected: false };
        this.localStorage.set('user_info', this.user_info);
    }

    // DETAIL DE L'UTILISATEUR
    getUserDetail(_user, _password) {
        const url = this.getUrlApi() + '/api/0.6/user/details';
        // const headers = new Headers();
        let headers = new HttpHeaders();
        headers = headers
            .set('Authorization', `Basic ${btoa(_user + ':' + _password)}`);

        return this.http.get(url, { headers: headers, responseType: 'text' })
            .pipe(
                map((res) => {
                    const xml = new DOMParser().parseFromString(res, 'text/xml');
                    const x_user = xml.getElementsByTagName('user')[0];
                    const uid = x_user.getAttribute('id');
                    const display_name = x_user.getAttribute('display_name');
                    const _userInfo = { user: _user, password: _password, uid: uid, display_name: display_name, connected: true };
                    this.setUserInfo(_userInfo);
                    return res;
                }),
                catchError((error: any) => {
                    return throwError(error);
                })
            );

    }
    // CHANGESET
    /* Edits can only be added to a changeset as long as it is still open;
    a changeset can either be closed explicitly (see your editor's documentation),
    or it closes itself if no edits are added to it for a period of inactivity (currently one hour).
    The same user can have multiple active changesets at the same time. A changeset has a maximum capacity
    (currently 50,000 edits) and maximum lifetime (currently 24 hours)
    */
    getChangeset() {
        return this.changeset;
    }

    setChangeset(_id: string, _created_at, _last_changeset_activity, _comment) { // alimente changeset + localstorage
        this.changeset = {
            id: _id,
            last_changeset_activity: _last_changeset_activity,
            created_at: _created_at,
            comment: _comment
        };  // to do => ajouter le serveur?
        this.localStorage.set('changeset', this.changeset);
    }

    updateChangesetLastActivity() {
        const time = Date.now();
        this.changeset.last_changeset_activity = time;
        this.localStorage.set('last_changeset_activity', time.toString());
    }

    /*id_CS = id du changeset*/
    getChangeSetStatus(id_CS) {
        const url = this.getUrlApi() + '/api/0.6/changeset/' + id_CS;

        return this.http.get(url, { responseType: 'text' })
            .pipe(
                map((res) => {
                    const xml = new DOMParser().parseFromString(res, 'text/xml');
                    const open = xml.getElementsByTagName('changeset')[0].getAttribute('open');
                    const user = xml.getElementsByTagName('changeset')[0].getAttribute('user');
                    return { open: open, user: user };
                }),
                catchError((error: any) => throwError(error.json().error || 'Impossible d\'accédé au changeset'))
            );
    }

    createOSMChangeSet(comment): Observable<any> {
        const url = this.getUrlApi() + '/api/0.6/changeset/create';
        const appVersion =  `${this.configService.getAppVersion().appName} ${this.configService.getAppVersion().appVersionNumber} ${this.configService.device.platform || ''}`;
        const content_put = `
        <osm>
            <changeset>
                <tag k="created_by" v="${appVersion}"/>
                <tag k="comment" v="${comment}"/>
                <tag k="source" v="survey"/>
            </changeset>
        </osm>`;

        let headers = new HttpHeaders();
        headers = headers
            .set('Authorization', `Basic ${btoa(this.getUserInfo().user + ':' + this.getUserInfo().password)}`);

        return this.http.put(url, content_put, { headers: headers, responseType: 'text' })
            .pipe(
                map((res) => {
                    this.setChangeset(res, Date.now(), Date.now(), comment);
                    return res;
                }),
                catchError((error: any) => throwError(error.json().error || 'Impossible de créer le changeset'))
            );
    }



    // determine si le changset est valide, sinon on en crée un nouveau
    getValidChangset(_comments): Observable<any> {
        // si il n'existe pas
        if (this.getChangeset().id == null || this.getChangeset().id === '') {
            return this.createOSMChangeSet(_comments);
        } else if (_comments !== this.getChangeset().comment) { // un commentaire différent => nouveau ChangeSet
            return this.createOSMChangeSet(_comments);
        } else if ((Date.now() - this.getChangeset().last_changeset_activity) / 1000 > 3540 || // bientot une heure sans activité
            (Date.now() - this.getChangeset().last_changeset_activity) / 1000 > 86360) {    // bientot > 24h
            return this.createOSMChangeSet(_comments);
        } else {
            return of(this.getChangeset().id)
                .pipe(
                    map(CS => CS)
                );
        }
    }


    escapeXmlValue(a){
     return a
     .replace(/&/g, '&amp;')
     .replace(/'/g, "&apos;")
     .replace(/"/g, '&quot;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
 }

    // GEOJSON => XML osm
    geojson2OsmCreate(geojson, id_changeset) {
        const tags_json = geojson.properties.tags;
        const lng = geojson.geometry.coordinates[0];
        const lat = geojson.geometry.coordinates[1];
        const node_header = `<node changeset="${id_changeset}" lat="${lat}" lon="${lng}">`;
        let tags_xml = '';
        for (const k in tags_json) {
            if (k !== '' && tags_json[k] !== '') { // TODO: miss 
                tags_xml += `<tag 
                k="${this.escapeXmlValue(k.trim())}"
                v="${this.escapeXmlValue(String(tags_json[k]).trim())}"/>`;
            }
        }
        const xml = `<osm> ${node_header}  ${tags_xml} </node></osm>`;
        return (xml);
    }

    // convert feature to xml(osm)
    geojson2OsmUpdate(_feature, id_changeset) {
        const tags_json = _feature.properties.tags;
        const type_objet = _feature.properties.type;
        const version = _feature.properties.meta.version;
        const id = _feature.properties.id;

        if (type_objet === 'node') { // c'est un noeud, les coords sont dans le Geojson
            const lng = _feature.geometry.coordinates[0];
            const lat = _feature.geometry.coordinates[1];
            const node_header = `<node id="${id}"
                    changeset="${id_changeset}"
                    version="${version}"
                    lat="${lat}" lon="${lng}">`;

            let tags_xml = '';
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                                    k="${this.escapeXmlValue(k.trim())}"
                                    v="${this.escapeXmlValue(String(tags_json[k]).trim())}"/>`;

                }
            }
            const xml = '<osm>' + node_header + tags_xml + '</node></osm>';
            return (xml);
        } else if (type_objet === 'way') {
            const way_header = '<way id="' + id + '" changeset="' + id_changeset + '" version="' + version + '">';
            let tags_xml = '';
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                    k="${this.escapeXmlValue(k.trim())}"
                    v="${this.escapeXmlValue(String(tags_json[k]).trim())}"/>`;
                }
            }
            let nd_ref_xml = '';
            for (let i = 0; i < _feature.ndRefs.length; i++) {
                nd_ref_xml += `<nd ref="${_feature.ndRefs[i]}"/>`;
            }
            const xml = `<osm> ${way_header}${nd_ref_xml}${tags_xml}</way></osm>`;
            return xml;
        } else if (type_objet === 'relation') {
            const relation_header = `<relation id="${id}" changeset="${id_changeset}" version="${version}">`;
            let tags_xml = '';
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                        k="${this.escapeXmlValue(k.trim())}"
                        v="${this.escapeXmlValue(String(tags_json[k]).trim())}"/>`;
                }
            }
            let rel_ref_xml = '';
            for (let i = 0; i < _feature.relMembers.length; i++) {
                rel_ref_xml += `<member
                    type="${_feature.relMembers[i].type}"
                    role="${_feature.relMembers[i].role}"
                    ref="${_feature.relMembers[i].ref}"/>`;
            }
            const xml = `<osm>
                    ${relation_header}
                    ${tags_xml}
                    ${rel_ref_xml}
                </relation></osm>`;
            return xml;
        }

    }


    /// CREATE NODE

    createOsmNode(_feature) {
        const feature = _.cloneDeep(_feature);
        const d = new Date();
        const tmpId = 'tmp_' + d.getTime();
        feature.id = 'node/' + tmpId;
        feature.properties.id = tmpId;
        feature.properties['meta'] = { timestamp: 0, version: 0, user: '' };
        feature.properties.changeType = 'Create';
        feature.properties.originalData = null;
        this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
        // refresh changed only
        return of(_feature);

    }
    apiOsmCreateNode(_feature, changesetId) {
        const feature =  _.cloneDeep(_feature);
        const url = this.getUrlApi() + '/api/0.6/node/create';
        const content_put = this.geojson2OsmCreate(feature, changesetId);

        let headers = new HttpHeaders();
        headers = headers
            .set('Authorization', `Basic ${btoa(this.getUserInfo().user + ':' + this.getUserInfo().password)}`);

        return this.http.put(url, content_put, { headers: headers, responseType: 'text' })
            .pipe(
                map(id => {
                    return id;
                }),
                catchError( error => {
                    return throwError(error); 
                })
               
            );
    }

    // Update
    updateOsmElement(_feature, origineData) {
        const feature = _.cloneDeep(_feature);
        const id = feature.id;
        if (origineData === 'data_changed') {// il a déjà été modifié == if (feature.properties.changeType)
            this.dataService.updateFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
        } else { // jamais été modifié, n'exite donc pas dans this.geojsonChanged mais dans le this.geojson
            feature.properties.changeType = 'Update';
            feature.properties.originalData = this.dataService.getFeatureById(feature.properties.id, 'data');
            this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            this.dataService.deleteFeatureFromGeojson(feature);
        }
        return of(id);
    }

    apiOsmUpdateOsmElement(_feature, changesetId) {
        const feature = _.cloneDeep(_feature);
        const id = feature.id;

        const url = this.getUrlApi() + '/api/0.6/' + id;
        const content_put = this.geojson2OsmUpdate(feature, changesetId);

        let headers = new HttpHeaders();
        headers = headers
            .set('Authorization', `Basic ${btoa(this.getUserInfo().user + ':' + this.getUserInfo().password)}`)
            .set('Content-Type', 'text/xml');

        return this.http.put(url, content_put, { headers: headers, responseType: 'text' })
            .pipe(
                map(data => {
                    this.mapService.eventOsmElementUpdated.emit(feature);
                    return data;
                }),
                catchError( error => {
                    return throwError(error); 
                })
                
            );
    }

  

    // Delete
    deleteOsmElement(_feature) {
        const feature = _.cloneDeep(_feature);
        const id = feature.id;

        if (feature.properties.changeType) { // il a déjà été modifié
            if (feature.properties.changeType === 'Create') { // il n'est pas sur le serveur, on le supprime des 2 geojson
                this.dataService.deleteFeatureFromGeojsonChanged(feature);
            } else if (feature.properties.changeType === 'Update') { // on reprend les données originales
                this.dataService.updateFeatureToGeojson(feature.properties.originalData);
                feature.properties.changeType = 'Delete';
                this.dataService.updateFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            }
        } else { // jamais été modifié, n'exite donc pas dans this.geojsonChanged
            feature.properties.changeType = 'Delete';
            feature.properties.originalData = this.dataService.getFeatureById(feature.properties.id, 'data');
            this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
            this.dataService.deleteFeatureFromGeojson(feature);
        }
        return of(id);
    }

    apiOsmDeleteOsmElement(_feature, changesetId) {
        const feature = _.cloneDeep(_feature);
        const id = feature.id;
        const content_delete = this.geojson2OsmUpdate(feature, changesetId);
        const url = this.getUrlApi() + '/api/0.6/' + id;

        let headers = new HttpHeaders();
        headers = headers
            .set('Authorization', `Basic ${btoa(this.getUserInfo().user + ':' + this.getUserInfo().password)}`);

        // TODO !

        return this.http.request('delete', url, { headers: headers, body: content_delete })
            .pipe(
                map(data => {
                    this.mapService.eventOsmElementDeleted.emit(feature);
                    return data;
                }),
                catchError( error => {
                    return throwError(error); 
                })
            );
    }

    /*
        Observable : Utilise un Web Worker pour, ajouter un point au polygon, definir le style, filtrer et fusionner les données
    */
    formatOsmJsonData$(osmData, oldGeojson, featureBbox, geojsonChanged) {
        const that = this;
       
        const oldBbox = this.dataService.getGeojsonBbox();
            const oldBboxFeature = _.cloneDeep(oldBbox.features[0]);
            // console.log(oldBboxFeature);

        return from(
            new Promise((resolve, reject) => {
                const workerFormatData = new Worker('assets/workers/worker-formatOsmData.js');
                workerFormatData.postMessage({
                    tagsConfig: that.tagsService.getTags(),
                    osmData: osmData,
                    oldGeojson: oldGeojson,
                    oldBboxFeature: oldBboxFeature,
                    geojsonChanged: geojsonChanged
                });

                workerFormatData.onmessage =  (formatedData) => {
                    workerFormatData.terminate();
                    if (formatedData.data) {
                        resolve(formatedData.data);
                    } else {
                        reject(Error('It broke'));
                    }
                };
            })
        );
    }

    /*
        Convertit les donnée XML d'OSM en geojson en utilisant osmtogeojson
        Filtre les données*
        Convertit les polygones/lignes en point
        Generation du style dans les properties*
        Fusion avec les données existantes (ancienne + les données modifiés)*

        * utilisation du webworker
    */
    formatDataResult(osmData, oldGeojson, featureBbox, geojsonChanged) {
        
        return this.formatOsmJsonData$(osmData, oldGeojson, featureBbox, geojsonChanged)
            .subscribe(newDataJson => {
                // Il y a eu une erreur lors de la conversion => exemple, timeOut et code 200
                if (newDataJson['error']) {
                    throw (newDataJson['error']);
                }
 
                this.dataService.setGeojsonBbox(newDataJson['geojsonBbox']);
                this.mapService.eventNewBboxPolygon.emit(newDataJson['geojsonBbox']);
                this.dataService.setGeojson(newDataJson['geojson']);
                this.mapService.eventMarkerReDraw.emit(newDataJson['geojson']);
                this.mapService.loadingData = false;
            },
                error => {
                    // TODO?
                    console.log(error);
                }
            );
    }

    getDataFromBbox(bbox: any) {
        const featureBbox = bboxPolygon(bbox);
        for (let i = 0; i < featureBbox.geometry.coordinates[0].length; i++) {
            featureBbox.geometry.coordinates[0][i][0] = featureBbox.geometry.coordinates[0][i][0];
            featureBbox.geometry.coordinates[0][i][1] = featureBbox.geometry.coordinates[0][i][1];
        }

            const url = this.getUrlApi() + '/api/0.6/map?bbox=' + bbox.join(',');
            return this.http.get(url, { responseType: 'text' })
                .pipe(
                    map((osmData) => {
                        this.formatDataResult(osmData, this.dataService.getGeojson(), featureBbox, this.dataService.getGeojsonChanged());
                    }),
                    catchError((error: any) => {
                        return throwError(error.error || 'Impossible de télécharger les données (api)');
                    }
                    )
                );

        
    }
} // EOF Services
