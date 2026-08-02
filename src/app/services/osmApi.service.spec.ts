import { HttpClient } from '@angular/common/http'
import {
    fakeAsync,
    flushMicrotasks,
    TestBed,
    tick,
} from '@angular/core/testing'
import { Platform } from '@ionic/angular/standalone'
import { Storage } from '@ionic/storage-angular'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmAuthService } from '@services/osm-auth.service'
import { TagsService } from '@services/tags.service'
import { NEVER, Observable, of, throwError } from 'rxjs'

import { OsmApiService } from './osmApi.service'

interface ServiceDependencies {
    http?: object
    tagsService?: object
    dataService?: object
    configService?: object
    osmAuthService?: object
}

function createService({
    http = {},
    tagsService = {},
    dataService = {},
    configService = {},
    osmAuthService = {},
}: ServiceDependencies = {}): OsmApiService {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
        providers: [
            { provide: Platform, useValue: {} },
            { provide: HttpClient, useValue: http },
            { provide: MapService, useValue: {} },
            { provide: TagsService, useValue: tagsService },
            { provide: DataService, useValue: dataService },
            { provide: AlertService, useValue: {} },
            { provide: ConfigService, useValue: configService },
            { provide: Storage, useValue: {} },
            { provide: OsmAuthService, useValue: osmAuthService },
        ],
    })
    return TestBed.inject(OsmApiService)
}

describe('OsmApiService', () => {
    it('does not serialize empty or undefined OSM tag keys', () => {
        const service = createService()
        const feature = {
            properties: {
                id: -1,
                tags: {
                    amenity: 'toilets',
                    undefined: 'unisex',
                    ' ': 'female',
                    name: '',
                },
            },
            geometry: { coordinates: [1, 2] },
        }

        const createXml = service.geojson2OsmCreate(feature, '123')
        const updateXml = service.geojson2OsmUpdate(
            {
                ...feature,
                properties: {
                    ...feature.properties,
                    type: 'node',
                    meta: { version: 1 },
                },
            },
            '123'
        )

        for (const xml of [createXml, updateXml]) {
            expect(xml).toContain('k="amenity"')
            expect(xml).toContain('v="toilets"')
            expect(xml).not.toContain('undefined')
            expect(xml).not.toContain('female')
            expect(xml).not.toContain('k="name"')
        }
    })

    it('escapes every changeset XML attribute value', () => {
        const http = {
            put: vi.fn().mockName('HttpClient.put'),
        }
        http.put.mockReturnValue(of('123'))

        const configService = {
            getAppFullVersion: () => `OsmGo's & "mobile" <app>`,
            getIsDevServer: () => false,
            setChangeset: vi.fn().mockName('setChangeset'),
        }
        const osmAuthService = {
            getToken: () => 'token',
            oauthParam: {
                dev: { url: 'https://api06.dev.openstreetmap.org' },
                prod: { url: 'https://api.openstreetmap.org' },
            },
        }
        const service = createService({ http, configService, osmAuthService })
        vi.spyOn(navigator, 'language', 'get').mockReturnValue(
            `fr-FR & "test" <locale>`
        )

        service
            .createOSMChangeSet(`Commerces & cafés <centre> "nuit"`)
            .subscribe()

        const expectedBody = `
        <osm>
            <changeset>
                <tag k="created_by" v="OsmGo&apos;s &amp; &quot;mobile&quot; &lt;app&gt;"/>
                <tag k="locale" v="fr-FR &amp; &quot;test&quot; &lt;locale&gt;"/>
                <tag k="comment" v="Commerces &amp; cafés &lt;centre&gt; &quot;nuit&quot;"/>
                <tag k="source" v="survey"/>
            </changeset>
        </osm>`

        expect(http.put).toHaveBeenCalledTimes(1)
        expect(vi.mocked(http.put).mock.lastCall[1]).toBe(expectedBody)
    })

    describe('diff result XML', () => {
        let service: OsmApiService

        beforeEach(() => {
            service = createService()
        })

        it('parses created, updated and deleted OSM elements', () => {
            const xml = `
                <diffResult generator="OpenStreetMap Server" version="0.6">
                    <node old_id="-1" new_id="101" new_version="1"/>
                    <way old_id="12" new_id="12" new_version="4"/>
                    <relation old_id="20"/>
                </diffResult>`

            expect(service.convertDiffFileResult(xml)).toEqual([
                {
                    type: 'node',
                    typeChange: 'Create',
                    old_id: '-1',
                    new_id: '101',
                    new_version: 1,
                    osmgoOldId: 'node/-1',
                    osmgoNewId: 'node/101',
                },
                {
                    type: 'way',
                    typeChange: 'Update',
                    old_id: '12',
                    new_id: '12',
                    new_version: 4,
                    osmgoOldId: 'way/12',
                    osmgoNewId: 'way/12',
                },
                {
                    type: 'relation',
                    typeChange: 'Delete',
                    old_id: '20',
                    osmgoOldId: 'relation/20',
                },
            ])
        })

        it('rejects malformed XML', () => {
            expect(() =>
                service.convertDiffFileResult('<diffResult><node></diffResult>')
            ).toThrowError('OpenStreetMap returned an invalid XML response.')
        })

        it('rejects XML without a diff result', () => {
            expect(() => service.convertDiffFileResult('<html/>')).toThrowError(
                'OpenStreetMap returned an invalid diff result.'
            )
        })

        it('rejects an empty diff element', () => {
            expect(() =>
                service.convertDiffFileResult(
                    '<diffResult><node/></diffResult>'
                )
            ).toThrowError('OpenStreetMap returned an invalid diff result.')
        })
    })

    describe('request timeouts', () => {
        let http: any
        let service: OsmApiService

        beforeEach(() => {
            http = {
                get: vi.fn().mockName('HttpClient.get'),
                put: vi.fn().mockName('HttpClient.put'),
                post: vi.fn().mockName('HttpClient.post'),
            }
            const configService = {
                getAppFullVersion: () => 'OsmGo 1.7.0',
                getIsDevServer: () => false,
            }
            const osmAuthService = {
                getToken: () => 'token',
                oauthParam: {
                    dev: { url: 'https://api06.dev.openstreetmap.org' },
                    prod: { url: 'https://api.openstreetmap.org' },
                },
            }
            service = createService({ http, configService, osmAuthService })
        })

        function expectRequestToTimeOut(request: Observable<unknown>): void {
            let requestError
            request.subscribe({ error: (error) => (requestError = error) })

            tick(30001)

            expect(requestError?.name).toBe('TimeoutError')
        }

        it('times out user verification', fakeAsync(() => {
            vi.spyOn(console, 'error').mockReturnValue(undefined)
            http.get.mockReturnValue(NEVER)

            expectRequestToTimeOut(service.getUserDetail$())
        }))

        it('times out changeset creation', fakeAsync(() => {
            http.put.mockReturnValue(NEVER)

            expectRequestToTimeOut(service.createOSMChangeSet('Survey'))
        }))

        it('times out diff uploads', fakeAsync(() => {
            http.post.mockReturnValue(NEVER)

            expectRequestToTimeOut(
                service.apiOsmSendOsmDiffFile('<osmChange/>', '123')
            )
        }))
    })

    describe('expired authorization', () => {
        for (const status of [401, 403]) {
            it(`clears the local token after status ${status}`, () => {
                const http = {
                    get: vi.fn().mockName('HttpClient.get'),
                }
                http.get.mockReturnValue(throwError(() => ({ status })))
                const osmAuthService = {
                    getToken: () => 'expired-token',
                    clearToken: vi.fn().mockName('clearToken'),
                    oauthParam: {
                        dev: {
                            url: 'https://api06.dev.openstreetmap.org',
                        },
                        prod: { url: 'https://api.openstreetmap.org' },
                    },
                }
                const configService = { getIsDevServer: () => false }
                const service = createService({
                    http,
                    configService,
                    osmAuthService,
                })
                vi.spyOn(console, 'error').mockReturnValue(undefined)

                service.getUserDetail$().subscribe({ error: () => {} })

                expect(osmAuthService.clearToken).toHaveBeenCalledTimes(1)
            })
        }
    })

    describe('OSM data worker', () => {
        class FakeWorker {
            static latest: FakeWorker
            onmessage
            onerror
            onmessageerror
            postedMessage
            terminateCalls = 0

            constructor(
                public url: URL,
                public options: WorkerOptions
            ) {
                FakeWorker.latest = this
            }

            postMessage(message): void {
                this.postedMessage = message
            }

            terminate(): void {
                this.terminateCalls++
            }
        }

        let originalWorker
        let service: OsmApiService
        let oldGeojson
        let geojsonChanged

        beforeEach(() => {
            originalWorker = window.Worker
            ;(window as any).Worker = FakeWorker
            oldGeojson = { features: [{ id: 'node/1' }] }
            geojsonChanged = { features: [{ id: 'node/-1' }] }
            const dataService = {
                getGeojsonBbox: () => ({
                    features: [{ id: 'downloaded-area' }],
                }),
            }
            const tagsService = {
                tags: () => [{ key: 'amenity' }],
                primaryKeys: () => ['amenity'],
            }
            service = createService({ tagsService, dataService })
        })

        afterEach(() => {
            ;(window as any).Worker = originalWorker
        })

        function startConversion() {
            return service.formatOsmJsonData$(
                '<osm/>',
                oldGeojson,
                geojsonChanged,
                100
            )
        }

        it('resolves a successful structured response', fakeAsync(() => {
            let result
            startConversion().subscribe((value) => (result = value))

            expect(FakeWorker.latest.url.pathname).toMatch(
                /\/worker-[a-z0-9]+\.js$/i
            )
            expect(FakeWorker.latest.options).toEqual({ type: 'module' })
            expect(FakeWorker.latest.postedMessage).toEqual({
                tagsConfig: [{ key: 'amenity' }],
                primaryKeys: ['amenity'],
                osmData: '<osm/>',
                oldGeojson,
                oldBboxFeature: { id: 'downloaded-area' },
                geojsonChanged,
                limitFeatures: 100,
            })

            FakeWorker.latest.onmessage({
                data: { ok: true, data: { geojson: { features: [] } } },
            })
            flushMicrotasks()

            expect(result).toEqual({ geojson: { features: [] } })
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        }))

        it('rejects an invalid worker response', fakeAsync(() => {
            let resultError
            startConversion().subscribe({
                error: (error) => (resultError = error),
            })

            FakeWorker.latest.onmessage({
                data: { ok: true, data: undefined },
            })
            flushMicrotasks()

            expect(resultError.message).toContain('invalid response')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        }))

        it('rejects a conversion exception reported by the worker', fakeAsync(() => {
            let resultError
            startConversion().subscribe({
                error: (error) => (resultError = error),
            })

            FakeWorker.latest.onmessage({
                data: { ok: false, error: 'Conversion failed' },
            })
            flushMicrotasks()

            expect(resultError.message).toBe('Conversion failed')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
            expect(oldGeojson).toEqual({ features: [{ id: 'node/1' }] })
            expect(geojsonChanged).toEqual({ features: [{ id: 'node/-1' }] })
        }))

        it('rejects worker errors', fakeAsync(() => {
            let resultError
            startConversion().subscribe({
                error: (error) => (resultError = error),
            })

            FakeWorker.latest.onerror({ message: 'Worker crashed' })
            flushMicrotasks()

            expect(resultError.message).toBe('Worker crashed')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        }))

        it('rejects unreadable worker messages', fakeAsync(() => {
            let resultError
            startConversion().subscribe({
                error: (error) => (resultError = error),
            })

            FakeWorker.latest.onmessageerror()
            flushMicrotasks()

            expect(resultError.message).toContain('unreadable message')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        }))

        it('terminates a worker that times out', fakeAsync(() => {
            let resultError
            startConversion().subscribe({
                error: (error) => (resultError = error),
            })

            tick(30001)
            flushMicrotasks()

            expect(resultError.message).toContain('timed out')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        }))

        it('terminates a worker when conversion is cancelled', () => {
            const subscription = startConversion().subscribe()

            subscription.unsubscribe()

            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })
    })
})
