import { Injectable, EventEmitter } from '@angular/core';
import { Observable, throwError, of, from } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import * as osmAuth from 'osm-auth';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';


import { MapService } from './map.service';
import { TagsService } from './tags.service';
import { DataService } from './data.service';
import { AlertService } from './alert.service';
import { ConfigService, User } from './config.service';
import { cloneDeep } from 'lodash';

import bboxPolygon from '@turf/bbox-polygon'
import { Platform } from '@ionic/angular';
import { addAttributesToFeature } from '../../../scripts/osmToOsmgo/index.js'

@Injectable({ providedIn: 'root' })
export class OsmApiService {
    oauthParam = {
        prod: {
            url: 'https://www.openstreetmap.org',
            oauth_consumer_key: 'v2oE6nAar9KvIWLZHs4ip5oB7GFzbp6wTfznPNkr',
            oauth_secret: '1M71flXI86rh4JC3koIlAxn1KSzGksusvA8TgDz7'
        },

        dev: {
            url: 'https://master.apis.dev.openstreetmap.org',
            oauth_consumer_key: 'PmNIoIN7dRKXQqmVSi07LAh7okepVRv0VvQAX3pM',
            oauth_secret: 'NULSrWvYE5nKtwOkSVSYAJ2zBQUJK6AgJo6ZE5Ax',
        }
    }

    auth;
    eventNewPoint = new EventEmitter();

    constructor(
        private platform: Platform,
        private http: HttpClient,
        public mapService: MapService,
        public tagsService: TagsService,
        public dataService: DataService,
        public alertService: AlertService,
        public configService: ConfigService,
        private localStorage: Storage
    ) {

    
    }

    initAuth(){
        const landing = `${window.location.origin}/assets/land.html` // land_single.html
        const windowType = 'newFullPage';  // singlepage, popup, newFullPage
 
        this.auth = new osmAuth({
            url: this.configService.getIsDevServer() ? this.oauthParam.dev.url : this.oauthParam.prod.url,
            oauth_consumer_key: this.configService.getIsDevServer() ? this.oauthParam.dev.oauth_consumer_key : this.oauthParam.prod.oauth_consumer_key,
            oauth_secret: this.configService.getIsDevServer() ? this.oauthParam.dev.oauth_secret : this.oauthParam.prod.oauth_secret,
            auto: false, // show a login form if the user is not authenticated and
            landing: landing,
            windowType: windowType 
        });

    }

    login$(): Observable<any> {
        return Observable.create(
            observer => {
                this.auth.authenticate((e => {
                    observer.next(true)
                }))
            }
        ).pipe(
            map((res) => {
                return res;
            })
        );


    }

    isAuthenticated(): boolean {
        return this.auth.authenticated()
    }

    logout() {
        if (this.configService.user_info.authType == 'oauth'){
            this.auth.logout();
        }
        this.localStorage.remove('changeset')
        this.configService.resetUserInfo();
    }

    // retourne l'URL de l'API (dev ou prod)
    getUrlApi() {
        return this.configService.getIsDevServer() ? this.oauthParam.dev.url : this.oauthParam.prod.url;
    }

 

    // DETAIL DE L'UTILISATEUR
    getUserDetail$(_user?, _password?, basicAuth = false, passwordSaved = true, test = false): Observable<User> {
        const PATH_API = '/api/0.6/user/details'
        let _observable;
        if (!basicAuth) {
            _observable = Observable.create(
                observer => {
                    this.auth.xhr({
                        method: 'GET',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                    }, (err, details) => {
                        if (err) {
                            observer.error({ response: err.response || '??', status: err.status || 0 });
                        }
                        observer.next(details)
                    });
                })
        } else {
            const url = this.getUrlApi() + PATH_API;
            // const headers = new Headers();
            let headers = new HttpHeaders();
            headers = headers
                .set('Authorization', `Basic ${btoa(_user + ':' + _password)}`)
                .set('Content-Type', 'text/xml');

            _observable = this.http.get(url, { headers: headers, responseType: 'text' })
                .pipe(
                    map(res => new DOMParser().parseFromString(res, 'text/xml'))
                )
        }

        return _observable.pipe(
            map((res: Document) => {
                const xml = res
                const x_user = xml.getElementsByTagName('user')[0];
                const uid = x_user.getAttribute('id');
                const display_name = x_user.getAttribute('display_name');
                const _userInfo: User = { user: _user, password: passwordSaved ?_password : null, uid: uid, display_name: display_name, connected: true,  authType: basicAuth ? 'basic' : 'oauth',};
                if (!test){
                    this.configService.setUserInfo(_userInfo);
                }
               
                return _userInfo;
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



    createOSMChangeSet(comment, password): Observable<any> {
        const appVersion = `${this.configService.getAppVersion().appName} ${this.configService.getAppVersion().appVersionNumber}`;
        const content_put = `
        <osm>
            <changeset>
                <tag k="created_by" v="${appVersion}"/>
                <tag k="comment" v="${comment}"/>
                <tag k="source" v="survey"/>
            </changeset>
        </osm>`;

        const PATH_API = `/api/0.6/changeset/create`

        let _observable;
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create(
                observer => {
                    this.auth.xhr({
                        method: 'PUT',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: content_put

                    }, (err, details) => {
                        if (err) {
                            observer.error({ response: err.response || '??', status: err.status || 0 });
                        }
                        observer.next(details)
                    })
                }
            )

        } else {
            const url = this.getUrlApi() + PATH_API;
            let headers = new HttpHeaders();
            headers = headers
                .set('Authorization', `Basic ${btoa(this.configService.getUserInfo().user + ':' + password)}`)
                .set('Content-Type', 'text/xml');

            _observable = this.http.put(url, content_put, { headers: headers, responseType: 'text' })
        }

        return _observable.pipe(
            map((res) => {
                this.configService.setChangeset(res.toString(), Date.now(), Date.now(), comment);
                return res;
            })
        );
    }

    // determine si le changset est valide, sinon on en crée un nouveau
    getValidChangset(_comments, password): Observable<any> {
        // si il n'existe pas
        if (this.configService.getChangeset().id == null || this.configService.getChangeset().id === '') {
            return this.createOSMChangeSet(_comments, password);
        } else if (_comments !== this.configService.getChangeset().comment) { // un commentaire différent => nouveau ChangeSet
            return this.createOSMChangeSet(_comments, password);
        } else if ((Date.now() - this.configService.getChangeset().last_changeset_activity) / 1000 > 3540 || // bientot une heure sans activité
            (Date.now() - this.configService.getChangeset().last_changeset_activity) / 1000 > 86360) {    // bientot > 24h
            return this.createOSMChangeSet(_comments, password);
        } else {
            return of(this.configService.getChangeset().id)
                .pipe(
                    map(CS => CS)
                );
        }
    }


    escapeXmlValue(a) {
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
        const feature = cloneDeep(_feature);
        const d = new Date();
        const tmpId = 'tmp_' + d.getTime();
        feature.id = 'node/' + tmpId;
        feature.properties.id = tmpId;
        feature.properties['meta'] = { timestamp: 0, version: 0, user: '' };
        feature.properties.changeType = 'Create';
        feature.properties.originalData = null;
        addAttributesToFeature(feature)
        this.dataService.addFeatureToGeojsonChanged(this.mapService.getIconStyle(feature));
        // refresh changed only
        return of(_feature);

    }

    apiOsmCreateNode(_feature, changesetId, password) {
        const feature = cloneDeep(_feature);
        const content_put = this.geojson2OsmCreate(feature, changesetId);
        const PATH_API = `/api/0.6/node/create`
        let _observable;
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create(
                observer => {
                    this.auth.xhr({
                        method: 'PUT',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: content_put

                    }, (err, details) => {
                        if (err) {
                            observer.error({ response: err.response || '??', status: err.status || 0 });
                        }
                        observer.next(details)
                    })
                }
            )
        } else {

            const url = this.getUrlApi() + '/api/0.6/node/create';
            let headers = new HttpHeaders();
            headers = headers
                .set('Authorization', `Basic ${btoa(this.configService.getUserInfo().user + ':' + password)}`);

            _observable = this.http.put(url, content_put, { headers: headers, responseType: 'text' })
        }

        return _observable.pipe(
            map(id => {
                return id;
            }),
            catchError(error => {
                return throwError(error);
            })
        );
    }

    // Update
    updateOsmElement(_feature, origineData) {
        const feature = cloneDeep(_feature);
        addAttributesToFeature(feature)
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

    apiOsmUpdateOsmElement(_feature, changesetId, password) {
        const feature = cloneDeep(_feature);
        const id = feature.id;
        const content_put = this.geojson2OsmUpdate(feature, changesetId);
        const PATH_API = `/api/0.6/${id}`
        let _observable;
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create(
                observer => {
                    this.auth.xhr({
                        method: 'PUT',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: content_put

                    }, (err, details) => {
                        if (err) {
                            observer.error({ response: err.response || '??', status: err.status || 0 });
                        }
                        observer.next(details)
                    })
                }
            )

        } else {

            const url = this.getUrlApi() + PATH_API

            let headers = new HttpHeaders();
            headers = headers
                .set('Authorization', `Basic ${btoa(this.configService.getUserInfo().user + ':' + password)}`)
                .set('Content-Type', 'text/xml');

            _observable = this.http.put(url, content_put, { headers: headers, responseType: 'text' })
        }

        return _observable.pipe(
            map(data => {
                this.mapService.eventOsmElementUpdated.emit(feature);
                return data;
            }),
            catchError(error => {
                return throwError(error);
            })
        );
    }



    // Delete
    deleteOsmElement(_feature) {
        const feature = cloneDeep(_feature);
        addAttributesToFeature(feature)
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

    apiOsmDeleteOsmElement(_feature, changesetId, password) {
        const feature = cloneDeep(_feature);
        const id = feature.id;
        const content_delete = this.geojson2OsmUpdate(feature, changesetId);
        const PATH_API = `/api/0.6/${id}`
        let _observable;
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create(
                observer => {
                    this.auth.xhr({
                        method: 'DELETE',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: content_delete

                    }, (err, details) => {
                        if (err) {
                            observer.error({ response: err.response || '??', status: err.status || 0 });

                        }
                        observer.next(details)
                    })
                }
            )
        } else {
            const url = this.getUrlApi() + PATH_API

            let headers = new HttpHeaders();
            headers = headers
                .set('Authorization', `Basic ${btoa(this.configService.getUserInfo().user + ':' + password)}`);

            _observable = this.http.request('delete', url, { headers: headers, body: content_delete })
        }

        return _observable.pipe(
            map(data => {
                this.mapService.eventOsmElementDeleted.emit(feature);
                return data;
            }),
            catchError(error => {
                return throwError(error);
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
    
    formatOsmJsonData$(osmData, oldGeojson, geojsonChanged) {
        const that = this;
        const oldBbox = this.dataService.getGeojsonBbox();
        const oldBboxFeature = cloneDeep(oldBbox.features[0]);

        return from(
            new Promise((resolve, reject) => {
                const workerFormatData = new Worker('assets/workers/worker-formatOsmData.js');
                workerFormatData.postMessage({
                    tagsConfig: that.tagsService.tags,
                    primaryKeys: that.tagsService.primaryKeys,
                    osmData: osmData,
                    oldGeojson: oldGeojson,
                    oldBboxFeature: oldBboxFeature,
                    geojsonChanged: geojsonChanged
                });

                workerFormatData.onmessage = (formatedData) => {
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

    getDataFromBbox(bbox: any) {
        const featureBbox = bboxPolygon(bbox);
        for (let i = 0; i < featureBbox.geometry.coordinates[0].length; i++) {
            featureBbox.geometry.coordinates[0][i][0] = featureBbox.geometry.coordinates[0][i][0];
            featureBbox.geometry.coordinates[0][i][1] = featureBbox.geometry.coordinates[0][i][1];
        }

        const headers = new HttpHeaders() 
            .set('Content-Type', 'text/xml')
            .set('Accept', 'text/xml');

        const url = this.getUrlApi() + `/api/0.6/map?bbox=${bbox.join(',')}`;
    
        return this.http.get(url, {headers: headers, responseType: 'text' })
            .pipe(
                switchMap(osmData =>  this.formatOsmJsonData$(osmData,  this.dataService.getGeojson(), this.dataService.getGeojsonChanged())),
                map((newDataJson => {
                    return newDataJson
                }),
                catchError((error: any) => {
                    return throwError(error.error || 'Impossible de télécharger les données (api)');
                }
                ))
            );

    }
}
