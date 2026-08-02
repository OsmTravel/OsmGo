import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import type {
    FeatureIdSource,
    OsmGoChangeType,
    OsmGoFeature,
    OsmGoFeatureCollection,
    OsmRelationMember,
} from '@osmgo/type'
import {
    addAttributesToFeature,
    type ConvertResult,
} from '@scripts/osmToOsmgo/index.js'
import { ConfigService, type User } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { TagsService } from '@services/tags.service'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { BBox } from 'geojson'
import { cloneDeep } from 'lodash'
import { from, Observable, of, throwError } from 'rxjs'
import { catchError, map, switchMap, take, timeout } from 'rxjs/operators'
import { OsmAuthService } from './osm-auth.service'

const OSM_REQUEST_TIMEOUT_MS = 30_000
const OSM_WORKER_TIMEOUT_MS = 30_000

interface OsmUserResponse {
    user: {
        id: string | number
        display_name: string
    }
}

interface OsmApiObject {
    type: 'node' | 'way' | 'relation'
    lon?: string | number
    lat?: string | number
    nodes?: Array<string | number>
    members?: OsmRelationMember[]
}

interface OsmObjectResponse {
    elements: OsmApiObject[]
}

interface WorkerResponse {
    ok: boolean
    data?: ConvertResult
    error?: string
}

export interface OsmDiffResult {
    type: 'node' | 'way' | 'relation'
    typeChange: OsmGoChangeType
    old_id?: string
    new_id?: string
    new_version?: number
    osmgoOldId?: string
    osmgoNewId?: string
}

@Injectable({ providedIn: 'root' })
export class OsmApiService {
    private readonly http = inject(HttpClient)
    readonly mapService = inject(MapService)
    readonly tagsService = inject(TagsService)
    readonly dataService = inject(DataService)
    readonly configService = inject(ConfigService)
    readonly osmAuthService = inject(OsmAuthService)

    isAuthenticated(): boolean {
        return this.osmAuthService.isAuthenticated()
    }

    getUrlApi(): string {
        return this.configService.getIsDevServer()
            ? this.osmAuthService.oauthParam.dev.url
            : this.osmAuthService.oauthParam.prod.url
    }

    getUserDetail$(test = false): Observable<User> {
        const PATH_API = '/api/0.6/user/details.json'
        const token = this.osmAuthService.getToken()
        if (!token) {
            return throwError(() => new Error('You are not connected'))
        }

        const url = this.getUrlApi() + PATH_API
        let headers = new HttpHeaders()
        headers = headers
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/json')

        return this.http.get<OsmUserResponse>(url, { headers }).pipe(
            timeout(OSM_REQUEST_TIMEOUT_MS),
            map((response) => {
                if (
                    !response.user ||
                    response.user.id === null ||
                    response.user.id === undefined ||
                    typeof response.user.display_name !== 'string'
                ) {
                    throw new Error('OpenStreetMap returned invalid user data.')
                }
                const userInfo: User = {
                    uid: String(response.user.id),
                    display_name: response.user.display_name,
                    connected: true,
                }
                if (!test) {
                    this.configService.setUserInfo(userInfo)
                }
                return userInfo
            }),
            catchError((error: unknown) => {
                console.error(error)
                return this.handleAuthenticatedRequestError(error)
            })
        )
    }
    createOSMChangeSet(comment: string): Observable<string> {
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

        const PATH_API = '/api/0.6/changeset/create'

        const url = this.getUrlApi() + PATH_API
        const token = this.osmAuthService.getToken()
        if (!token) {
            return throwError(() => new Error('You are not connected'))
        }
        let headers = new HttpHeaders()
        headers = headers
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/xml')

        return this.http
            .put(url, content, {
                headers: headers,
                responseType: 'text',
            })
            .pipe(
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
                catchError((error) =>
                    this.handleAuthenticatedRequestError(error)
                )
            )
    }

    getValidChangeset(comment: string): Observable<string> {
        const changeset = this.configService.getChangeset()
        if (
            changeset.id === '' ||
            comment !== changeset.comment ||
            Date.now() - changeset.last_changeset_activity > 3_540_000
        ) {
            return this.createOSMChangeSet(comment)
        }
        return of(changeset.id)
    }

    escapeXmlValue(value: unknown): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&apos;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
    }

    osmGoFeaturesToOsmDiffFile(
        features: OsmGoFeature[],
        idChangeset: string
    ): string {
        const createChanges: string[] = []
        const modifyChanges: string[] = []
        const deleteChanges: string[] = []

        for (const feature of features) {
            if (feature.properties.changeType === 'Create') {
                const xml = this.geojson2OsmCreate(feature, idChangeset)
                createChanges.push(xml)
            } else if (feature.properties.changeType === 'Update') {
                const xml = this.geojson2OsmUpdate(feature, idChangeset)
                modifyChanges.push(xml)
            } else if (feature.properties.changeType === 'Delete') {
                const usedByWays = feature.properties.usedByWays
                if (
                    usedByWays === true ||
                    (Array.isArray(usedByWays) && usedByWays.length > 0)
                ) {
                    const featureWithoutTags = {
                        ...feature,
                        properties: { ...feature.properties, tags: {} },
                    }
                    const xml = this.geojson2OsmUpdate(
                        featureWithoutTags,
                        idChangeset
                    )
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

    convertDiffFileResultProperties(
        type: 'node' | 'way' | 'relation',
        properties: unknown
    ): OsmDiffResult {
        if (
            !properties ||
            typeof properties !== 'object' ||
            Array.isArray(properties)
        ) {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }
        const raw = properties as Record<string, unknown>
        const oldId = raw['old_id']
        if (oldId === undefined || oldId === null || String(oldId) === '') {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }

        const rawVersion = raw['new_version']
        const newVersion =
            rawVersion === undefined || rawVersion === null
                ? undefined
                : Number(rawVersion)
        if (
            newVersion !== undefined &&
            (!Number.isInteger(newVersion) || newVersion < 1)
        ) {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }

        const newId = raw['new_id']
        if (
            newVersion !== undefined &&
            (newId === undefined || newId === null || String(newId) === '')
        ) {
            throw new Error('OpenStreetMap returned an invalid diff result.')
        }

        const typeChange: OsmGoChangeType =
            newVersion === undefined
                ? 'Delete'
                : newVersion === 1
                  ? 'Create'
                  : 'Update'
        const oldIdString = String(oldId)
        const row: OsmDiffResult = {
            type,
            typeChange,
            old_id: oldIdString,
            osmgoOldId: `${type}/${oldIdString}`,
        }

        if (newId !== undefined && newId !== null && String(newId) !== '') {
            row.new_id = String(newId)
            row.osmgoNewId = `${type}/${String(newId)}`
        }
        if (newVersion !== undefined) row.new_version = newVersion
        return row
    }

    convertDiffFileResult(diffTextResult: string): OsmDiffResult[] {
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
        const result: OsmDiffResult[] = []
        if (diffJson.node !== undefined) {
            if (!Array.isArray(diffJson.node)) {
                diffJson.node = [diffJson.node]
            }
            for (const properties of diffJson.node) {
                const rowConverted = this.convertDiffFileResultProperties(
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
                const rowConverted = this.convertDiffFileResultProperties(
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
                const rowConverted = this.convertDiffFileResultProperties(
                    'relation',
                    properties
                )
                result.push(rowConverted)
            }
        }
        return result
    }

    apiOsmSendOsmDiffFile(
        diffFile: string,
        changesetId: string
    ): Observable<OsmDiffResult[]> {
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

        return this.http
            .post(url, diffFile, {
                headers: headers,
                responseType: 'text',
            })
            .pipe(
                timeout(OSM_REQUEST_TIMEOUT_MS),
                map((diffTextResult) => {
                    return this.convertDiffFileResult(diffTextResult)
                }),
                catchError((error) =>
                    this.handleAuthenticatedRequestError(error)
                )
            )
    }

    private handleAuthenticatedRequestError(error: unknown): Observable<never> {
        const status = this.getErrorStatus(error)
        if (status === 401 || status === 403) {
            this.osmAuthService.clearToken()
        }
        return throwError(() => error)
    }

    geojson2OsmCreate(feature: OsmGoFeature, changesetId: string): string {
        if (feature.geometry.type !== 'Point') {
            throw new Error('Only point features can be created.')
        }
        const lng = feature.geometry.coordinates[0]
        const lat = feature.geometry.coordinates[1]
        const id = feature.properties.id
        const header = `<node changeset="${changesetId}" id="${id}" lat="${lat}" lon="${lng}">`
        return `${header}${this.osmTagsToXml(feature.properties.tags)}</node>`
    }

    geojson2OsmUpdate(feature: OsmGoFeature, changesetId: string): string {
        const tagsXml = this.osmTagsToXml(feature.properties.tags)
        const objectType = feature.properties.type
        const version = feature.properties.meta.version
        const id = feature.properties.id

        if (objectType === 'node') {
            if (feature.geometry.type !== 'Point') {
                throw new Error('An OSM node requires point geometry.')
            }
            const lng = feature.geometry.coordinates[0]
            const lat = feature.geometry.coordinates[1]
            const node_header = `<node id="${id}"
                    changeset="${changesetId}"
                    version="${version}"
                    lat="${lat}" lon="${lng}">`
            return `${node_header}${tagsXml}</node>`
        }
        if (objectType === 'way') {
            if (!feature.ndRefs) {
                throw new Error('An OSM way requires node references.')
            }
            const nodeReferences = feature.ndRefs
                .map((reference) => `<nd ref="${reference}"/>`)
                .join('')
            return `<way id="${id}" changeset="${changesetId}" version="${version}">${nodeReferences}${tagsXml}</way>`
        }
        if (objectType === 'relation') {
            if (!feature.members) {
                throw new Error('An OSM relation requires members.')
            }
            const members = feature.members
                .map(
                    (member) =>
                        `<member type="${member.type}" role="${this.escapeXmlValue(member.role)}" ref="${member.ref}"/>`
                )
                .join('')
            return `<relation id="${id}" changeset="${changesetId}" version="${version}">${tagsXml}${members}</relation>`
        }
        throw new Error(`Unsupported OSM object type: ${objectType}`)
    }

    private isValidOsmTag(key: string, value: unknown): boolean {
        const normalizedKey = key.trim()
        return (
            normalizedKey !== '' &&
            normalizedKey !== 'undefined' &&
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        )
    }

    createOsmNode(featureToCreate: OsmGoFeature): Observable<unknown> {
        const feature = cloneDeep(featureToCreate)
        const id = this.dataService.nextFeatureId

        feature.id = 'node/' + id
        feature.properties.id = id
        feature.properties.meta = {
            timestamp: '',
            version: 0,
            user: '',
            uid: '',
            changeset: '',
        }
        feature.properties.changeType = 'Create'
        feature.properties.originalData = null
        addAttributesToFeature(feature)
        return from(
            this.dataService.addFeatureToGeojsonChanged(
                this.mapService.getIconStyle(feature)
            )
        )
    }

    updateOsmElement(
        featureToUpdate: OsmGoFeature,
        origineData: FeatureIdSource
    ): Observable<unknown> {
        const feature = cloneDeep(featureToUpdate)
        addAttributesToFeature(feature)
        if (origineData === 'data_changed') {
            return from(
                this.dataService.updateFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        } else {
            if (!feature.id) {
                return throwError(() => new Error('A feature ID is required.'))
            }
            const originalData = this.dataService.getFeatureById(
                feature.id,
                'data'
            )
            if (!originalData) {
                return throwError(
                    () => new Error('The original feature data is missing.')
                )
            }
            feature.properties.changeType = 'Update'
            feature.properties.originalData = originalData
            this.dataService.deleteFeatureFromGeojson(feature)
            return from(
                this.dataService.addFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        }
    }

    deleteOsmElement(featureToDelete: OsmGoFeature): Observable<unknown> {
        const feature = cloneDeep(featureToDelete)
        addAttributesToFeature(feature)

        if (feature.properties.changeType) {
            if (feature.properties.changeType === 'Create') {
                return from(
                    this.dataService.deleteFeatureFromGeojsonChanged(feature)
                )
            } else if (feature.properties.changeType === 'Update') {
                if (!feature.properties.originalData) {
                    return throwError(
                        () => new Error('The original feature data is missing.')
                    )
                }
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
            if (!feature.id) {
                return throwError(() => new Error('A feature ID is required.'))
            }
            const originalData = this.dataService.getFeatureById(
                feature.id,
                'data'
            )
            if (!originalData) {
                return throwError(
                    () => new Error('The original feature data is missing.')
                )
            }
            feature.properties.changeType = 'Delete'
            feature.properties.originalData = originalData
            this.dataService.deleteFeatureFromGeojson(feature)
            return from(
                this.dataService.addFeatureToGeojsonChanged(
                    this.mapService.getIconStyle(feature)
                )
            )
        }
        return throwError(() => new Error('Unsupported feature change type.'))
    }

    formatOsmJsonData$(
        osmData: string,
        oldGeojson: OsmGoFeatureCollection,
        geojsonChanged: OsmGoFeatureCollection,
        limitFeatures = 10_000
    ): Observable<ConvertResult> {
        const oldBbox = this.dataService.getGeojsonBbox()
        const oldBboxFeature = cloneDeep(oldBbox.features[0])

        return new Observable<ConvertResult>((subscriber) => {
            const worker = new Worker(
                new URL('../workers/osm-converter.worker', import.meta.url),
                { type: 'module' }
            )
            let isFinished = false
            const finish = (callback: () => void): void => {
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
                const response = event.data as WorkerResponse
                const data = response?.data
                if (!response || typeof response.ok !== 'boolean') {
                    fail('The OSM data worker returned an invalid response.')
                } else if (response.ok) {
                    if (data === undefined) {
                        fail(
                            'The OSM data worker returned an invalid response.'
                        )
                        return
                    }
                    const convertedData = data
                    finish(() => {
                        subscriber.next(convertedData)
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
                    tagsConfig: this.tagsService.tags(),
                    primaryKeys: this.tagsService.primaryKeys(),
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

    getOsmObjectById$(objectId: string): Observable<OsmApiObject> {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')

        const url = this.getUrlApi() + `/api/0.6/${objectId}.json`
        return this.http
            .get<OsmObjectResponse>(url, {
                headers: headers,
                responseType: 'json',
            })
            .pipe(
                map((response) => {
                    const object = response.elements?.[0]
                    if (!object) {
                        throw new Error('No OSM object found.')
                    }
                    return object
                })
            )
    }

    fetchNodeCoordinates(
        nodeId: string | number
    ): Observable<{ lon: number; lat: number }> {
        return this.getOsmObjectById$(`node/${nodeId}`).pipe(
            map((node) => this.getNodeCoordinates(node))
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
                    return of(this.getNodeCoordinates(object))
                } else if (object.type === 'way') {
                    const nodeId = object.nodes?.[0]
                    if (nodeId === undefined) {
                        return throwError(
                            () => new Error('No coordinates found')
                        )
                    }
                    return this.fetchNodeCoordinates(nodeId)
                } else if (object.type === 'relation') {
                    const referencedObject = object.members?.find(
                        (member) =>
                            member.type === 'node' || member.type === 'way'
                    )
                    if (referencedObject) {
                        return this.getOsmObjectById$(
                            `${referencedObject.type}/${referencedObject.ref}`
                        ).pipe(
                            switchMap((referenced) => {
                                if (referenced.type === 'way') {
                                    const nodeId = referenced.nodes?.[0]
                                    if (nodeId === undefined) {
                                        return throwError(
                                            () =>
                                                new Error(
                                                    'No coordinates found'
                                                )
                                        )
                                    }
                                    return this.fetchNodeCoordinates(nodeId)
                                } else if (referenced.type === 'node') {
                                    return of(
                                        this.getNodeCoordinates(referenced)
                                    )
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
                }
            }),
            catchError(() =>
                throwError(() => new Error('No coordinates found'))
            )
        )
    }

    getDataFromBbox(
        bbox: BBox,
        limitFeatures = 10_000
    ): Observable<ConvertResult> {
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
                catchError((error: unknown) =>
                    throwError(
                        () =>
                            new Error(
                                this.getErrorMessage(
                                    error,
                                    'Unable to download OpenStreetMap data.'
                                )
                            )
                    )
                )
            )
    }

    private osmTagsToXml(tags: Record<string, unknown>): string {
        let xml = ''
        for (const [key, value] of Object.entries(tags)) {
            if (this.isValidOsmTag(key, value)) {
                xml += `<tag k="${this.escapeXmlValue(key.trim())}" v="${this.escapeXmlValue(String(value).trim())}"/>`
            }
        }
        return xml
    }

    private getNodeCoordinates(node: OsmApiObject): {
        lon: number
        lat: number
    } {
        const lon = Number(node.lon)
        const lat = Number(node.lat)
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
            throw new Error('No coordinates found')
        }
        return { lon, lat }
    }

    private getErrorStatus(error: unknown): number | undefined {
        if (typeof error !== 'object' || error === null) return undefined
        const status = (error as { status?: unknown }).status
        return typeof status === 'number' ? status : undefined
    }

    private getErrorMessage(error: unknown, fallback: string): string {
        if (error instanceof Error && error.message) return error.message
        if (typeof error !== 'object' || error === null) return fallback
        const details = error as { error?: unknown; message?: unknown }
        if (typeof details.error === 'string' && details.error.trim()) {
            return details.error
        }
        if (typeof details.message === 'string' && details.message.trim()) {
            return details.message
        }
        return fallback
    }
}
