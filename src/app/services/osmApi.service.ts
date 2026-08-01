import { HttpClient, HttpHeaders } from '@angular/common/http'
import { EventEmitter, Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'
import { Storage } from '@ionic/storage-angular'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'
import { AlertService } from '@services/alert.service'
import { ConfigService, User } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { TagsService } from '@services/tags.service'
import { bboxPolygon } from '@turf/bbox-polygon'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { cloneDeep } from 'lodash'
import { from, Observable, of, throwError } from 'rxjs'
import { catchError, map, switchMap, take, tap, timeout } from 'rxjs/operators'
import { OsmAuthService } from './osm-auth.service'

const OSM_REQUEST_TIMEOUT_MS = 30_000
const OSM_WORKER_TIMEOUT_MS = 30_000

@Injectable({ providedIn: 'root' })
export class OsmApiService {
    eventNewPoint = new EventEmitter()

    constructor(
        private platform: Platform,
        private http: HttpClient,
        public mapService: MapService,
        public tagsService: TagsService,
        public dataService: DataService,
        public alertService: AlertService,
        public configService: ConfigService,
        private localStorage: Storage,
        public osmAuthService: OsmAuthService
    ) {}

    isAuthenticated(): boolean {
        return this.osmAuthService.isAuthenticated()
    }

    // retourne l'URL de l'API (dev ou prod)
    getUrlApi() {
        return this.configService.getIsDevServer()
            ? this.osmAuthService.oauthParam.dev.url
            : this.osmAuthService.oauthParam.prod.url
    }

    // DETAIL DE L'UTILISATEUR
    getUserDetail$(test = false): Observable<User> {
        const PATH_API = '/api/0.6/user/details.json'
        let _observable
        const token = this.osmAuthService.getToken()
        if (!token) {
            return throwError(() => new Error('You are not connected'))
        }

        const url = this.getUrlApi() + PATH_API
        // const headers = new Headers();
        let headers = new HttpHeaders()
        headers = headers
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/json')

        _observable = this.http.get(url, { headers: headers })

        return _observable.pipe(
            timeout(OSM_REQUEST_TIMEOUT_MS),
            map((res: any) => {
                const x_user = res.user
                const uid = x_user['id']
                const display_name = x_user['display_name']
                const _userInfo: User = {
                    uid: uid,
                    display_name: display_name,
                    connected: true,
                }
                if (!test) {
                    this.configService.setUserInfo(_userInfo)
                }
                return _userInfo
            }),
            catchError((error: any) => {
                console.error(error)
                return this.handleAuthenticatedRequestError(error)
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

    createOSMChangeSet(comment): Observable<any> {
        const appVersion = this.configService.getAppFullVersion()

        const localeId = navigator?.language || '*'
        const content = `
        <osm>
            <changeset>
                <tag k="created_by" v="${this.escapeXmlValue(appVersion)}"/>
                <tag k="locale" v="${this.escapeXmlValue(localeId)}"/>
                <tag k="comment" v="${this.escapeXmlValue(comment)}"/>
                <tag k="source" v="${this.escapeXmlValue('survey')}"/>
            </changeset>
        </osm>`

        const PATH_API = `/api/0.6/changeset/create`

        let _observable

        const url = this.getUrlApi() + PATH_API
        const token = this.osmAuthService.getToken()
        if (!token) {
            return throwError(() => new Error('You are not connected'))
        }
        let headers = new HttpHeaders()
        headers = headers
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/xml')

        _observable = this.http.put(url, content, {
            headers: headers,
            responseType: 'text',
        })

        return _observable.pipe(
            timeout(OSM_REQUEST_TIMEOUT_MS),
            map((res) => {
                this.configService.setChangeset(
                    res.toString(),
                    Date.now(),
                    Date.now(),
                    comment
                )
                return res
            }),
            catchError((error) => this.handleAuthenticatedRequestError(error))
        )
    }

    // determine si le changset est valide, sinon on en crée un nouveau
    getValidChangset(_comments): Observable<any> {
        // si il n'existe pas
        if (
            this.configService.getChangeset().id == null ||
            this.configService.getChangeset().id === ''
        ) {
            return this.createOSMChangeSet(_comments)
        } else if (_comments !== this.configService.getChangeset().comment) {
            // un commentaire différent => nouveau ChangeSet
            return this.createOSMChangeSet(_comments)
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
            return this.createOSMChangeSet(_comments)
        } else {
            return of(this.configService.getChangeset().id).pipe(
                map((CS) => CS)
            )
        }
    }

    escapeXmlValue(value: unknown): string {
        return String(value)
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
        if (
            !properties ||
            typeof properties !== 'object' ||
            Array.isArray(properties)
        ) {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }
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
        if (XMLValidator.validate(diffTextResult) !== true) {
            throw new Error('OpenStreetMap returned an invalid XML response.')
        }
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: '',
            allowBooleanAttributes: true,
        }
        const parser = new XMLParser(options)
        const diffJson = parser.parse(diffTextResult)?.diffResult
        if (
            !diffJson ||
            typeof diffJson !== 'object' ||
            Array.isArray(diffJson)
        ) {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }
        const result = []
        if (diffJson.node !== undefined) {
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

        if (diffJson.way !== undefined) {
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

        if (diffJson.relation !== undefined) {
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

    apiOsmSendOsmDiffFile(diffFile, changesetId) {
        const PATH_API = `/api/0.6/changeset/${changesetId}/upload`
        let _observable: Observable<string>

        const url =
            this.getUrlApi() + `/api/0.6/changeset/${changesetId}/upload`

        const token = this.osmAuthService.getToken()
        if (!token) {
            return throwError(() => new Error('You are not connected'))
        }

        let headers = new HttpHeaders()
        headers = headers
            .set('Authorization', `Bearer ${token}`)
            .set('accept', 'application/xml')
            .set('Content-Type', 'text/plain; charset=utf-8')

        _observable = this.http.post(url, diffFile, {
            headers: headers,
            responseType: 'text',
        })

        return _observable.pipe(
            timeout(OSM_REQUEST_TIMEOUT_MS),
            map((diffTextResult) => {
                return this.convertDiffFileResult(diffTextResult)
            }),
            catchError((error) => this.handleAuthenticatedRequestError(error))
        )
    }

    private handleAuthenticatedRequestError(error: any): Observable<never> {
        if (error?.status === 401 || error?.status === 403) {
            this.osmAuthService.clearToken()
        }
        return throwError(() => error)
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
            if (this.isValidOsmTag(k, tags_json[k])) {
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
                if (this.isValidOsmTag(k, tags_json[k])) {
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
                if (this.isValidOsmTag(k, tags_json[k])) {
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
                if (this.isValidOsmTag(k, tags_json[k])) {
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

    private isValidOsmTag(key: string, value: unknown): boolean {
        const normalizedKey = key.trim()
        return (
            normalizedKey !== '' &&
            normalizedKey !== 'undefined' &&
            value != null &&
            String(value).trim() !== ''
        )
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
        const oldBbox = this.dataService.getGeojsonBbox()
        const oldBboxFeature = cloneDeep(oldBbox.features[0])

        return new Observable((subscriber) => {
            const worker = new Worker('assets/workers/worker-formatOsmData.js')
            let isFinished = false
            const finish = (callback): void => {
                if (isFinished) return
                isFinished = true
                window.clearTimeout(timeoutId)
                worker.terminate()
                callback()
            }
            const fail = (message: string): void => {
                finish(() => subscriber.error(new Error(message)))
            }
            const timeoutId = window.setTimeout(() => {
                fail('OSM data conversion timed out.')
            }, OSM_WORKER_TIMEOUT_MS)

            worker.onmessage = (event) => {
                const response = event.data
                if (
                    !response ||
                    typeof response.ok !== 'boolean' ||
                    (response.ok && response.data == null)
                ) {
                    fail('The OSM data worker returned an invalid response.')
                } else if (response.ok) {
                    finish(() => {
                        subscriber.next(response.data)
                        subscriber.complete()
                    })
                } else {
                    fail(
                        typeof response.error === 'string' &&
                            response.error.trim()
                            ? response.error
                            : 'The OSM data worker failed.'
                    )
                }
            }
            worker.onerror = (event) => {
                fail(event.message || 'The OSM data worker crashed.')
            }
            worker.onmessageerror = () => {
                fail('The OSM data worker returned an unreadable message.')
            }

            try {
                worker.postMessage({
                    tagsConfig: this.tagsService.tags,
                    primaryKeys: this.tagsService.primaryKeys,
                    osmData,
                    oldGeojson,
                    oldBboxFeature,
                    geojsonChanged,
                    limitFeatures,
                })
            } catch (error) {
                fail(
                    error instanceof Error
                        ? error.message
                        : 'The OSM data worker could not start.'
                )
            }

            return () => finish(() => {})
        })
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
