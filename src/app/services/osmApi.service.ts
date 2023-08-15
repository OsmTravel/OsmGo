import { Injectable, EventEmitter } from '@angular/core'
import { Observable, throwError, of, from } from 'rxjs'
import { map, catchError, switchMap, tap, take } from 'rxjs/operators'

import * as osmAuth from 'osm-auth'

import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Storage } from '@ionic/storage-angular'

import { MapService } from '@services/map.service'
import { TagsService } from '@services/tags.service'
import { DataService } from '@services/data.service'
import { AlertService } from '@services/alert.service'
import { ConfigService, User } from '@services/config.service'
import { cloneDeep } from 'lodash'

import bboxPolygon from '@turf/bbox-polygon'
import { Platform } from '@ionic/angular'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'

import { XMLParser } from 'fast-xml-parser'

@Injectable({ providedIn: 'root' })
export class OsmApiService {
    oauthParam = {
        prod: {
            url: 'https://www.openstreetmap.org',
            oauth_consumer_key: 'v2oE6nAar9KvIWLZHs4ip5oB7GFzbp6wTfznPNkr',
            oauth_secret: '1M71flXI86rh4JC3koIlAxn1KSzGksusvA8TgDz7',
        },

        dev: {
            url: 'https://master.apis.dev.openstreetmap.org',
            oauth_consumer_key: 'PmNIoIN7dRKXQqmVSi07LAh7okepVRv0VvQAX3pM',
            oauth_secret: 'NULSrWvYE5nKtwOkSVSYAJ2zBQUJK6AgJo6ZE5Ax',
        },
    }

    auth
    eventNewPoint = new EventEmitter()

    constructor(
        private platform: Platform,
        private http: HttpClient,
        public mapService: MapService,
        public tagsService: TagsService,
        public dataService: DataService,
        public alertService: AlertService,
        public configService: ConfigService,
        private localStorage: Storage
    ) {}

    initAuth() {
        const landing = `${window.location.origin}/assets/land.html` // land_single.html
        const windowType = 'newFullPage' // singlepage, popup, newFullPage

        this.auth = new osmAuth.default({
            url: this.configService.getIsDevServer()
                ? this.oauthParam.dev.url
                : this.oauthParam.prod.url,
            oauth_consumer_key: this.configService.getIsDevServer()
                ? this.oauthParam.dev.oauth_consumer_key
                : this.oauthParam.prod.oauth_consumer_key,
            oauth_secret: this.configService.getIsDevServer()
                ? this.oauthParam.dev.oauth_secret
                : this.oauthParam.prod.oauth_secret,
            auto: false, // show a login form if the user is not authenticated and
            landing: landing,
            windowType: windowType,
        })
    }

    login$(): Observable<any> {
        return Observable.create((observer) => {
            this.auth.authenticate((e) => {
                observer.next(true)
            })
        }).pipe(
            map((res) => {
                return res
            })
        )
    }

    isAuthenticated(): boolean {
        return this.auth.authenticated()
    }

    logout() {
        if (this.configService.user_info.authType == 'oauth') {
            this.auth.logout()
        }
        this.localStorage.remove('changeset')
        this.configService.resetUserInfo()
    }

    // retourne l'URL de l'API (dev ou prod)
    getUrlApi() {
        return this.configService.getIsDevServer()
            ? this.oauthParam.dev.url
            : this.oauthParam.prod.url
    }

    // DETAIL DE L'UTILISATEUR
    getUserDetail$(
        _user?,
        _password?,
        basicAuth = false,
        passwordSaved = true,
        test = false
    ): Observable<User> {
        const PATH_API = '/api/0.6/user/details.json'
        let _observable
        if (!basicAuth) {
            _observable = Observable.create((observer) => {
                this.auth.xhr(
                    {
                        method: 'GET',
                        path: PATH_API,
                        options: {
                            header: { 'Content-Type': 'application/json' },
                        },
                    },
                    (err, details) => {
                        if (err) {
                            observer.error({
                                response: err.response || '??',
                                status: err.status || 0,
                            })
                        }
                        observer.next(JSON.parse(details))
                    }
                )
            })
        } else {
            const url = this.getUrlApi() + PATH_API
            // const headers = new Headers();
            let headers = new HttpHeaders()
            headers = headers
                .set('Authorization', `Basic ${btoa(_user + ':' + _password)}`)
                .set('Content-Type', 'application/json')

            _observable = this.http.get(url, { headers: headers })
        }

        return _observable.pipe(
            map((res: any) => {
                const x_user = res.user
                const uid = x_user['id']
                const display_name = x_user['display_name']
                const _userInfo: User = {
                    user: _user,
                    password: passwordSaved ? _password : null,
                    uid: uid,
                    display_name: display_name,
                    connected: true,
                    authType: basicAuth ? 'basic' : 'oauth',
                }
                if (!test) {
                    this.configService.setUserInfo(_userInfo)
                }
                return _userInfo
            }),
            catchError((error: any) => {
                return throwError(error)
            })
        )
    }
    // CHANGESET
    /* Edits can only be added to a changeset as long as it is still open;
    a changeset can either be closed explicitly (see your editor's documentation),
    or it closes itself if no edits are added to it for a period of inactivity (currently one hour).
    The same user can have multiple active changesets at the same time. A changeset has a maximum capacity
    (currently 50,000 edits) and maximum lifetime (currently 24 hours)
    */

    createOSMChangeSet(comment, password): Observable<any> {
        const appVersion = `${this.configService.getAppVersion().appName} ${
            this.configService.getAppVersion().appVersionNumber
        }`
        const localeId = navigator?.language || '*'
        const content_put = `
        <osm>
            <changeset>
                <tag k="created_by" v="${appVersion}"/>
                <tag k="locale" v="${localeId}"/>
                <tag k="comment" v="${comment}"/>
                <tag k="source" v="survey"/>
            </changeset>
        </osm>`

        const PATH_API = `/api/0.6/changeset/create`

        let _observable
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create((observer) => {
                this.auth.xhr(
                    {
                        method: 'PUT',
                        path: PATH_API,
                        options: { header: { 'Content-Type': 'text/xml' } },
                        content: content_put,
                    },
                    (err, details) => {
                        if (err) {
                            observer.error({
                                response: err.response || '??',
                                status: err.status || 0,
                            })
                        }
                        observer.next(details)
                    }
                )
            })
        } else {
            const url = this.getUrlApi() + PATH_API
            let headers = new HttpHeaders()
            headers = headers
                .set(
                    'Authorization',
                    `Basic ${btoa(
                        this.configService.getUserInfo().user + ':' + password
                    )}`
                )
                .set('Content-Type', 'text/xml')

            _observable = this.http.put(url, content_put, {
                headers: headers,
                responseType: 'text',
            })
        }

        return _observable.pipe(
            map((res) => {
                this.configService.setChangeset(
                    res.toString(),
                    Date.now(),
                    Date.now(),
                    comment
                )
                return res
            })
        )
    }

    // determine si le changset est valide, sinon on en crée un nouveau
    getValidChangset(_comments, password): Observable<any> {
        // si il n'existe pas
        if (
            this.configService.getChangeset().id == null ||
            this.configService.getChangeset().id === ''
        ) {
            return this.createOSMChangeSet(_comments, password)
        } else if (_comments !== this.configService.getChangeset().comment) {
            // un commentaire différent => nouveau ChangeSet
            return this.createOSMChangeSet(_comments, password)
        } else if (
            (Date.now() -
                this.configService.getChangeset().last_changeset_activity) /
                1000 >
                3540 || // bientot une heure sans activité
            (Date.now() -
                this.configService.getChangeset().last_changeset_activity) /
                1000 >
                86360
        ) {
            // bientot > 24h
            return this.createOSMChangeSet(_comments, password)
        } else {
            return of(this.configService.getChangeset().id).pipe(
                map((CS) => CS)
            )
        }
    }

    escapeXmlValue(a) {
        return a
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&apos;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
    }

    osmGoFeaturesToOsmDiffFile(features, idChangeset): string {
        const createChanges = []
        const modifyChanges = []
        const deleteChanges = []

        for (const feature of features) {
            if (feature.properties.changeType == 'Create') {
                const xml = this.geojson2OsmCreate(feature, idChangeset)
                createChanges.push(xml)
            } else if (feature.properties.changeType == 'Update') {
                const xml = this.geojson2OsmUpdate(feature, idChangeset)
                modifyChanges.push(xml)
            } else if (feature.properties.changeType == 'Delete') {
                // if the node is used by a way, we just remove the tag, not the node
                if (
                    feature.properties.usedByWays &&
                    feature.properties.usedByWays.length > 0
                ) {
                    feature.properties.tags = {}
                    const xml = this.geojson2OsmUpdate(feature, idChangeset)
                    modifyChanges.push(xml)
                } else {
                    const xml = this.geojson2OsmUpdate(feature, idChangeset)
                    deleteChanges.push(xml)
                }
            }
        }

        const diffFile = `<osmChange version="0.6" generator="Osm Go !">
                            <create> 
                                ${createChanges.join('\n')}
                            </create>

                            <modify> 
                                ${modifyChanges.join('\n')}
                            </modify>

                            <delete> 
                                ${deleteChanges.join('\n')}
                            </delete>

                        </osmChange>
                `

        return diffFile
    }

    convertDiffFileResultPorperties(
        type: 'node' | 'way' | 'relation',
        properties: any
    ) {
        let typeChange: string
        if (!properties.new_version) {
            typeChange = 'Delete'
        } else if (parseInt(properties.new_version) === 1) {
            typeChange = 'Create'
        } else if (parseInt(properties.new_version) > 1) {
            typeChange = 'Update'
        }
        let row = { type, typeChange, ...properties }
        if (properties.old_id) {
            row = {
                ...row,
                old_id: properties.old_id,
                osmgoOldId: `${type}/${properties.old_id}`,
            }
        }
        if (properties.new_id) {
            row = {
                ...row,
                new_id: properties.new_id,
                osmgoNewId: `${type}/${properties.new_id}`,
            }
        }
        if (properties.new_version) {
            row = { ...row, new_version: parseInt(properties.new_version) }
        }
        return row
    }

    convertDiffFileResult(diffTextResult: string): any[] {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: '',
            allowBooleanAttributes: true,
        }
        const parser = new XMLParser(options)
        let diffJson = parser.parse(diffTextResult).diffResult
        const result = []
        if (diffJson.node) {
            if (!Array.isArray(diffJson.node)) {
                diffJson.node = [diffJson.node]
            }
            for (const properties of diffJson.node) {
                const rowConverted = this.convertDiffFileResultPorperties(
                    'node',
                    properties
                )
                result.push(rowConverted)
            }
        }

        if (diffJson.way) {
            if (!Array.isArray(diffJson.way)) {
                diffJson.way = [diffJson.way]
            }
            for (const properties of diffJson.way) {
                const rowConverted = this.convertDiffFileResultPorperties(
                    'way',
                    properties
                )
                result.push(rowConverted)
            }
        }

        if (diffJson.relation) {
            if (!Array.isArray(diffJson.relation)) {
                diffJson.relation = [diffJson.relation]
            }
            for (const properties of diffJson.relation) {
                const rowConverted = this.convertDiffFileResultPorperties(
                    'relation',
                    properties
                )
                result.push(rowConverted)
            }
        }
        return result
    }

    apiOsmSendOsmDiffFile(diffFile, changesetId, password) {
        const PATH_API = `/api/0.6/changeset/${changesetId}/upload`
        let _observable: Observable<string>
        if (this.configService.user_info.authType === 'oauth') {
            _observable = Observable.create((observer) => {
                this.auth.xhr(
                    {
                        method: 'POST',
                        path: PATH_API,
                        options: {
                            header: {
                                'Content-Type': 'text/plain; charset=utf-8',
                                accept: 'application/xml',
                            },
                        },
                        content: diffFile,
                    },
                    (err, details) => {
                        if (err) {
                            console.error(err)
                            observer.error({
                                status: err.status || 500,
                                error: err.responseText,
                            })
                        } else {
                            try {
                                const serializer = new XMLSerializer()
                                const xmlStr =
                                    serializer.serializeToString(details)
                                observer.next(xmlStr)
                            } catch (error) {
                                console.error('error', error)
                            }
                        }
                    }
                )
            })
        } else {
            const url =
                this.getUrlApi() + `/api/0.6/changeset/${changesetId}/upload`
            let headers = new HttpHeaders()
            headers = headers
                .set(
                    'Authorization',
                    `Basic ${btoa(
                        this.configService.getUserInfo().user + ':' + password
                    )}`
                )
                .set('accept', 'application/xml')
                .set('Content-Type', 'text/plain; charset=utf-8')

            _observable = this.http.post(url, diffFile, {
                headers: headers,
                responseType: 'text',
            })
        }

        return _observable.pipe(
            map((diffTextResult) => {
                return this.convertDiffFileResult(diffTextResult)
            })
        )
    }

    // GEOJSON => XML osm
    geojson2OsmCreate(feature, id_changeset) {
        const tags_json = feature.properties.tags
        const lng = feature.geometry.coordinates[0]
        const lat = feature.geometry.coordinates[1]
        const id = feature.properties.id
        const node_header = `<node changeset="${id_changeset}" id="${id}" lat="${lat}" lon="${lng}">`
        let tags_xml = ''
        for (const k in tags_json) {
            if (k !== '' && tags_json[k] !== '') {
                // TODO: miss
                tags_xml += `
                                    <tag k="${this.escapeXmlValue(
                                        k.trim()
                                    )}" v="${this.escapeXmlValue(
                    String(tags_json[k]).trim()
                )}"/>`
            }
        }
        const xml = `${node_header}  ${tags_xml} </node>`
        return xml
    }

    // convert feature to xml(osm)
    geojson2OsmUpdate(_feature, id_changeset) {
        const tags_json = _feature.properties.tags
        const type_objet = _feature.properties.type
        const version = _feature.properties.meta.version
        const id = _feature.properties.id

        if (type_objet === 'node') {
            // c'est un noeud, les coords sont dans le Geojson
            const lng = _feature.geometry.coordinates[0]
            const lat = _feature.geometry.coordinates[1]
            const node_header = `<node id="${id}"
                    changeset="${id_changeset}"
                    version="${version}"
                    lat="${lat}" lon="${lng}">`

            let tags_xml = ''
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                                    k="${this.escapeXmlValue(k.trim())}"
                                    v="${this.escapeXmlValue(
                                        String(tags_json[k]).trim()
                                    )}"/>`
                }
            }
            const xml = `${node_header} ${tags_xml}  </node>`
            return xml
        } else if (type_objet === 'way') {
            const way_header = `<way id="${id}" changeset="${id_changeset}" version="${version}">`
            let tags_xml = ''
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                    k="${this.escapeXmlValue(k.trim())}"
                    v="${this.escapeXmlValue(String(tags_json[k]).trim())}"/>`
                }
            }
            let nd_ref_xml = ''
            for (let i = 0; i < _feature.ndRefs.length; i++) {
                nd_ref_xml += `<nd ref="${_feature.ndRefs[i]}"/>`
            }
            const xml = `${way_header}${nd_ref_xml}${tags_xml}</way>`
            return xml
        } else if (type_objet === 'relation') {
            const relation_header = `<relation id="${id}" changeset="${id_changeset}" version="${version}">`
            let tags_xml = ''
            for (const k in tags_json) {
                if (k !== '' && tags_json[k] !== '') {
                    tags_xml += `<tag
                        k="${this.escapeXmlValue(k.trim())}"
                        v="${this.escapeXmlValue(
                            String(tags_json[k]).trim()
                        )}"/>`
                }
            }
            let rel_ref_xml = ''
            for (let i = 0; i < _feature.members.length; i++) {
                rel_ref_xml += `<member
                    type="${_feature.members[i].type}"
                    role="${_feature.members[i].role}"
                    ref="${_feature.members[i].ref}"/>`
            }
            const xml = `
                    ${relation_header}
                    ${tags_xml}
                    ${rel_ref_xml}
                </relation>`
            return xml
        }
    }

    /// CREATE NODE
    createOsmNode(_feature) {
        const feature = cloneDeep(_feature)
        const id = this.dataService.nextFeatureId

        feature.id = 'node/' + id
        feature.properties.id = id
        feature.properties['meta'] = { timestamp: 0, version: 0, user: '' }
        feature.properties.changeType = 'Create'
        feature.properties.originalData = null
        addAttributesToFeature(feature)
        return from(
            this.dataService.addFeatureToGeojsonChanged(
                this.mapService.getIconStyle(feature)
            )
        )
    }

    // Update
    updateOsmElement(_feature, origineData) {
        const feature = cloneDeep(_feature)
        addAttributesToFeature(feature)
        if (origineData === 'data_changed') {
            // il a déjà été modifié == if (feature.properties.changeType)
            return from(
                this.dataService.updateFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        } else {
            // jamais été modifié, n'exite donc pas dans this.geojsonChanged mais dans le this.geojson
            feature.properties.changeType = 'Update'
            feature.properties.originalData = this.dataService.getFeatureById(
                feature.id,
                'data'
            )
            this.dataService.deleteFeatureFromGeojson(feature)
            return from(
                this.dataService.addFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        }
    }

    // Delete
    deleteOsmElement(_feature) {
        const feature = cloneDeep(_feature)
        addAttributesToFeature(feature)

        if (feature.properties.changeType) {
            // il a déjà été modifié
            if (feature.properties.changeType === 'Create') {
                // il n'est pas sur le serveur, on le supprime des 2 geojson
                this.dataService.deleteFeatureFromGeojsonChanged(feature)
            } else if (feature.properties.changeType === 'Update') {
                // on reprend les données originales
                this.dataService.updateFeatureToGeojson(
                    feature.properties.originalData
                )
                feature.properties.changeType = 'Delete'
                return from(
                    this.dataService.updateFeatureToGeojsonChanged(
                        this.mapService.getIconStyle(feature)
                    )
                )
            }
        } else {
            // jamais été modifié, n'exite donc pas dans this.geojsonChanged
            feature.properties.changeType = 'Delete'
            feature.properties.originalData = this.dataService.getFeatureById(
                feature.id,
                'data'
            )
            this.dataService.deleteFeatureFromGeojson(feature)
            return from(
                this.dataService.addFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        }
    }

    /*
        Convertit les donnée XML d'OSM en geojson en utilisant osmtogeojson
        Filtre les données*
        Convertit les polygones/lignes en point
        Generation du style dans les properties*
        Fusion avec les données existantes (ancienne + les données modifiés)*

        * utilisation du webworker
    */

    formatOsmJsonData$(
        osmData,
        oldGeojson,
        geojsonChanged,
        limitFeatures: number = 10000
    ) {
        const that = this
        const oldBbox = this.dataService.getGeojsonBbox()
        const oldBboxFeature = cloneDeep(oldBbox.features[0])

        return from(
            new Promise((resolve, reject) => {
                const workerFormatData = new Worker(
                    'assets/workers/worker-formatOsmData.js'
                )
                workerFormatData.postMessage({
                    tagsConfig: that.tagsService.tags,
                    primaryKeys: that.tagsService.primaryKeys,
                    osmData: osmData,
                    oldGeojson: oldGeojson,
                    oldBboxFeature: oldBboxFeature,
                    geojsonChanged: geojsonChanged,
                    limitFeatures: limitFeatures,
                })

                workerFormatData.onmessage = (formatedData) => {
                    workerFormatData.terminate()
                    if (formatedData.data) {
                        resolve(formatedData.data)
                    } else {
                        reject(Error('It broke'))
                    }
                }
            })
        )
    }

    getOsmObjectById$(objectId: string): Observable<any> {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')

        const url = this.getUrlApi() + `/api/0.6/${objectId}.json`
        return this.http
            .get<any>(url, { headers: headers, responseType: 'json' })
            .pipe(
                map((d) => {
                    const object = d.elements[0]
                    if (object) {
                        return object
                    } else {
                        // return undefined
                        throwError(() => new Error('No coordinates found'))
                    }
                })
            )
    }

    fetchNodeCoordinates(nodeId: string): Observable<any> {
        return this.getOsmObjectById$(`node/${nodeId}`).pipe(
            map((node) => ({
                lon: parseFloat(node.lon),
                lat: parseFloat(node.lat),
            }))
        )
    }

    /*
       get the first coordinate of an object
        if it's a node, return the coordinate of the node
        if it's a way, return the coordinate of the first node
        if it's a relation, return the coordinate of the first node or way

     */
    getFirstCoordFromIdObject$(
        objectId: string
    ): Observable<{ lon: number; lat: number }> {
        const type = objectId.split('/')[0]
        if (!['node', 'way', 'relation'].includes(type)) {
            return throwError(() => new Error('Type not supported'))
        }

        return this.getOsmObjectById$(objectId).pipe(
            switchMap((object) => {
                if (object.type === 'node') {
                    return of({ lon: object.lon, lat: object.lat })
                } else if (object.type === 'way') {
                    const nodeId = object.nodes[0]
                    return this.fetchNodeCoordinates(nodeId)
                } else if (object.type === 'relation') {
                    const referencedObject = object.members.find(
                        (member) =>
                            member.type === 'node' || member.type === 'way'
                    )
                    if (referencedObject) {
                        return this.getOsmObjectById$(
                            `${referencedObject.type}/${referencedObject.ref}`
                        ).pipe(
                            switchMap((referenced) => {
                                if (referenced.type === 'way') {
                                    const nodeId = referenced.nodes[0]
                                    return this.fetchNodeCoordinates(nodeId)
                                } else if (referenced.type === 'node') {
                                    return of({
                                        lon: referenced.lon,
                                        lat: referenced.lat,
                                    })
                                } else {
                                    return throwError(
                                        () => new Error('No coordinates found')
                                    )
                                }
                            })
                        )
                    } else {
                        return throwError(
                            () => new Error('No coordinates found')
                        )
                    }
                } else {
                    return throwError(() => new Error('No coordinates found'))
                    // throw new Error('Type d\'objet non pris en charge');
                }
            }),
            catchError(() =>
                throwError(() => new Error('No coordinates found'))
            )
        )
    }

    getDataFromBbox(bbox: any, limitFeatures: number = 10000) {
        const featureBbox = bboxPolygon(bbox)
        for (let i = 0; i < featureBbox.geometry.coordinates[0].length; i++) {
            featureBbox.geometry.coordinates[0][i][0] =
                featureBbox.geometry.coordinates[0][i][0]
            featureBbox.geometry.coordinates[0][i][1] =
                featureBbox.geometry.coordinates[0][i][1]
        }

        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')

        const url = this.getUrlApi() + `/api/0.6/map?bbox=${bbox.join(',')}`

        return this.http
            .get(url, { headers: headers, responseType: 'text' })
            .pipe(
                switchMap((osmData) =>
                    this.formatOsmJsonData$(
                        osmData,
                        this.dataService.getGeojson(),
                        this.dataService.getGeojsonChanged(),
                        limitFeatures
                    )
                ),
                take(1),
                catchError((error: any) => {
                    return throwError(
                        error.error ||
                            'Impossible de télécharger les données (api)'
                    )
                })
            )
    }
}
