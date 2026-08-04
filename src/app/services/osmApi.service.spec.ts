import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import type { OsmGoFeature, OsmGoFeatureCollection } from '@osmgo/type'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmAuthService } from '@services/osm-auth.service'
import { TagsService } from '@services/tags.service'
import { firstValueFrom, NEVER, type Observable, of, throwError } from 'rxjs'

import { OsmApiService } from './osmApi.service'

interface ServiceDependencies {
    http?: object
    tagsService?: object
    dataService?: object
    mapService?: object
    configService?: object
    osmAuthService?: object
}

function createService({
    http = {},
    tagsService = {},
    dataService = {},
    mapService = {},
    configService = {},
    osmAuthService = {},
}: ServiceDependencies = {}): OsmApiService {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
        providers: [
            { provide: HttpClient, useValue: http },
            { provide: MapService, useValue: mapService },
            { provide: TagsService, useValue: tagsService },
            { provide: DataService, useValue: dataService },
            { provide: AlertService, useValue: {} },
            { provide: ConfigService, useValue: configService },
            { provide: OsmAuthService, useValue: osmAuthService },
        ],
    })
    return TestBed.inject(OsmApiService)
}

describe('OsmApiService', () => {
    it('does not serialize empty or undefined OSM tag keys', () => {
        const service = createService()
        const feature: OsmGoFeature = {
            type: 'Feature',
            id: 'node/-1',
            properties: {
                hexColor: '',
                icon: '',
                id: -1,
                marker: '',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: 1,
                },
                primaryTag: { key: 'amenity', value: 'toilets' },
                tags: {
                    amenity: 'toilets',
                    undefined: 'unisex',
                    ' ': 'female',
                    name: '',
                    level: 0,
                    ref: '  A 1  ',
                },
                type: 'node',
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }

        const createXml = service.geojson2OsmCreate(feature, '123')
        const updateXml = service.geojson2OsmUpdate(feature, '123')

        for (const xml of [createXml, updateXml]) {
            expect(xml).toContain('k="amenity"')
            expect(xml).toContain('v="toilets"')
            expect(xml).not.toContain('undefined')
            expect(xml).not.toContain('female')
            expect(xml).not.toContain('k="name"')
            expect(xml).toContain('<tag k="level" v="0"/>')
            expect(xml).toContain('<tag k="ref" v="A 1"/>')
        }
    })

    it('serializes validated relation members before tags', () => {
        const service = createService()
        const feature: OsmGoFeature = {
            type: 'Feature',
            id: 'relation/42',
            properties: {
                hexColor: '',
                icon: '',
                id: 42,
                marker: '',
                meta: {
                    changeset: '10',
                    timestamp: '',
                    uid: '1',
                    user: 'mapper',
                    version: 3,
                },
                primaryTag: { key: 'type', value: 'multipolygon' },
                tags: { type: 'multipolygon', name: 'Park & lake' },
                type: 'relation',
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
            members: [
                { type: 'way', ref: 10, role: 'outer' },
                { type: 'relation', ref: '-2', role: 'sub & area' },
            ],
        }

        const xml = service.geojson2OsmUpdate(feature, '123')

        expect(xml).toBe(
            '<relation id="42" changeset="123" version="3">' +
                '<member type="way" ref="10" role="outer"/>' +
                '<member type="relation" ref="-2" role="sub &amp; area"/>' +
                '<tag k="type" v="multipolygon"/>' +
                '<tag k="name" v="Park &amp; lake"/>' +
                '</relation>'
        )
        expect(xml.indexOf('<member')).toBeLessThan(xml.indexOf('<tag'))
    })

    it.each([
        [{ type: 'invalid', ref: 1, role: '' }, 'invalid type'],
        [{ type: 'way', ref: 0, role: '' }, 'invalid reference'],
        [{ type: 'node', ref: 'abc', role: '' }, 'invalid reference'],
        [{ type: 'relation', ref: 1, role: undefined }, 'invalid role'],
    ])('rejects a relation member with an %s', (member, message) => {
        const service = createService()
        const feature = {
            type: 'Feature',
            id: 'relation/42',
            properties: {
                id: 42,
                meta: { version: 1 },
                tags: { type: 'multipolygon' },
                type: 'relation',
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
            members: [member],
        } as any

        expect(() => service.geojson2OsmUpdate(feature, '123')).toThrow(message)
    })

    it.each([0, 1])(
        'rejects the non-negative temporary creation ID %s',
        (id) => {
            const service = createService()
            const feature = {
                type: 'Feature',
                id: `node/${id}`,
                properties: {
                    hexColor: '',
                    icon: '',
                    id,
                    marker: '',
                    meta: {
                        changeset: '',
                        timestamp: '',
                        uid: '',
                        user: '',
                        version: 0,
                    },
                    primaryTag: { key: 'amenity', value: 'bench' },
                    tags: { amenity: 'bench' },
                    type: 'node',
                },
                geometry: { type: 'Point', coordinates: [1, 2] },
            } as OsmGoFeature

            expect(() => service.geojson2OsmCreate(feature, '123')).toThrow(
                'strictly negative temporary ID'
            )
        }
    )

    it('escapes every changeset XML attribute value', () => {
        const http = {
            put: vi.fn().mockName('HttpClient.put'),
        }
        http.put.mockReturnValue(of('\n123\n'))

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
        expect(http.put).toHaveBeenCalledWith(
            expect.any(String),
            expectedBody,
            expect.any(Object)
        )
        expect(configService.setChangeset).toHaveBeenCalledWith(
            '123',
            expect.any(Number),
            expect.any(Number),
            `Commerces & cafés <centre> "nuit"`
        )
    })

    it.each(['', '0', '-1', '12.5', 'abc', '0123'])(
        'rejects the invalid changeset ID response %j',
        async (response) => {
            const http = { put: vi.fn(() => of(response)) }
            const configService = {
                getAppFullVersion: () => 'OsmGo 2',
                getIsDevServer: () => false,
                setChangeset: vi.fn(),
            }
            const osmAuthService = {
                getToken: () => 'token',
                clearToken: vi.fn(),
                oauthParam: {
                    dev: { url: 'https://api06.dev.openstreetmap.org' },
                    prod: { url: 'https://api.openstreetmap.org' },
                },
            }
            const service = createService({
                http,
                configService,
                osmAuthService,
            })

            await expect(
                firstValueFrom(service.createOSMChangeSet('Survey'))
            ).rejects.toThrow('invalid changeset ID')
            expect(configService.setChangeset).not.toHaveBeenCalled()
        }
    )

    it.each(['', '0', '-1', 'invalid'])(
        'does not reuse the invalid cached changeset ID %j',
        async (id) => {
            const configService = {
                getChangeset: () => ({
                    id,
                    comment: 'Survey',
                    created_at: Date.now(),
                    last_changeset_activity: Date.now(),
                }),
            }
            const service = createService({ configService })
            const create = vi
                .spyOn(service, 'createOSMChangeSet')
                .mockReturnValue(of('456'))

            await expect(
                firstValueFrom(service.getValidChangeset('Survey'))
            ).resolves.toBe('456')
            expect(create).toHaveBeenCalledWith('Survey')
        }
    )

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
                    old_id: '-1',
                    new_id: '101',
                    new_version: 1,
                    osmgoOldId: 'node/-1',
                    osmgoNewId: 'node/101',
                },
                {
                    type: 'way',
                    old_id: '12',
                    new_id: '12',
                    new_version: 4,
                    osmgoOldId: 'way/12',
                    osmgoNewId: 'way/12',
                },
                {
                    type: 'relation',
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

        it('rejects a non-positive version', () => {
            expect(() =>
                service.convertDiffFileResult(
                    '<diffResult><node old_id="-1" new_id="1" new_version="0"/></diffResult>'
                )
            ).toThrowError('OpenStreetMap returned an invalid diff result.')
        })

        it('rejects a created or updated element without a new ID', () => {
            expect(() =>
                service.convertDiffFileResult(
                    '<diffResult><node old_id="-1" new_version="1"/></diffResult>'
                )
            ).toThrowError('OpenStreetMap returned an invalid diff result.')
        })

        it('rejects a new ID without a corresponding version', () => {
            expect(() =>
                service.convertDiffFileResult(
                    '<diffResult><node old_id="1" new_id="1"/></diffResult>'
                )
            ).toThrowError('OpenStreetMap returned an invalid diff result.')
        })

        it.each(['0', 'abc', '1.5'])(
            'rejects the invalid old ID %s',
            (oldId) => {
                expect(() =>
                    service.convertDiffFileResult(
                        `<diffResult><node old_id="${oldId}"/></diffResult>`
                    )
                ).toThrowError('OpenStreetMap returned an invalid diff result.')
            }
        )
    })

    it('returns an observable when deleting a locally created feature', async () => {
        const markPendingDeleted = vi
            .fn()
            .mockName('markPendingDeleted')
            .mockResolvedValue(undefined)
        const feature: OsmGoFeature = {
            type: 'Feature',
            id: 'node/-1',
            properties: {
                changeType: 'Create',
                hexColor: '',
                icon: '',
                id: -1,
                marker: '',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: 0,
                },
                primaryTag: { key: 'amenity', value: 'bench' },
                tags: { amenity: 'bench' },
                type: 'node',
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
        }
        const service = createService({
            dataService: { markPendingDeleted },
            mapService: { getIconStyle: (value: OsmGoFeature) => value },
        })

        await firstValueFrom(service.deleteOsmElement(feature))

        expect(markPendingDeleted).toHaveBeenCalledWith('node/-1')
    })

    it('delegates temporary ID allocation to the atomic create command', async () => {
        const input: OsmGoFeature = {
            type: 'Feature',
            id: undefined,
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {
                hexColor: '',
                icon: '',
                id: 999,
                marker: '',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: 0,
                },
                primaryTag: { key: 'amenity', value: 'bench' },
                tags: { amenity: 'bench' },
                type: 'node',
            },
        }
        const created = structuredClone(input)
        created.id = 'node/-1'
        created.properties.id = -1
        created.properties.changeType = 'Create'
        const createPendingFeature = vi.fn().mockResolvedValue(created)
        const service = createService({
            dataService: { createPendingFeature },
            mapService: { getIconStyle: (value: OsmGoFeature) => value },
        })

        const result = await firstValueFrom(service.createOsmNode(input))

        expect(result).toEqual(created)
        expect(createPendingFeature).toHaveBeenCalledTimes(1)
        expect(createPendingFeature.mock.calls[0][0].properties.id).toBe(999)
    })

    it.each([
        ['data', 'moveOfficialToPending'],
        ['data_changed', 'updatePendingFeature'],
    ] as const)(
        'uses one atomic command when updating %s',
        async (source, commandName) => {
            const feature: OsmGoFeature = {
                type: 'Feature',
                id: 'node/10',
                geometry: { type: 'Point', coordinates: [1, 2] },
                properties: {
                    hexColor: '',
                    icon: '',
                    id: 10,
                    marker: '',
                    meta: {
                        changeset: '',
                        timestamp: '',
                        uid: '',
                        user: '',
                        version: 1,
                    },
                    primaryTag: { key: 'amenity', value: 'bench' },
                    tags: { amenity: 'bench' },
                    type: 'node',
                },
            }
            const command = vi.fn().mockResolvedValue(feature)
            const service = createService({
                dataService: { [commandName]: command },
                mapService: { getIconStyle: (value: OsmGoFeature) => value },
            })

            const result = await firstValueFrom(
                service.updateOsmElement(feature, source)
            )

            expect(result).toEqual(feature)
            expect(command).toHaveBeenCalledWith('node/10', feature)
        }
    )

    describe('request timeouts', () => {
        let http: any
        let service: OsmApiService

        beforeEach(() => {
            vi.useFakeTimers()
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

        async function expectRequestToTimeOut(
            request: Observable<unknown>
        ): Promise<void> {
            let requestError: Error | undefined
            request.subscribe({
                error: (error: Error) => (requestError = error),
            })

            await vi.advanceTimersByTimeAsync(30001)

            expect(requestError?.name).toBe('TimeoutError')
        }

        afterEach(() => vi.useRealTimers())

        it('times out user verification', async () => {
            vi.spyOn(console, 'error').mockReturnValue(undefined)
            http.get.mockReturnValue(NEVER)

            await expectRequestToTimeOut(service.getUserDetail$())
        })

        it('times out changeset creation', async () => {
            http.put.mockReturnValue(NEVER)

            await expectRequestToTimeOut(service.createOSMChangeSet('Survey'))
        })

        it('times out diff uploads', async () => {
            http.post.mockReturnValue(NEVER)

            await expectRequestToTimeOut(
                service.apiOsmSendOsmDiffFile('<osmChange/>', '123')
            )
        })
    })

    describe('expired authorization', () => {
        it.each([
            [401, 1],
            [403, 0],
        ])(
            'status %s clears the local token %s time(s)',
            (status, expectedCalls) => {
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

                expect(osmAuthService.clearToken).toHaveBeenCalledTimes(
                    expectedCalls
                )
            }
        )
    })

    describe('OSM data worker', () => {
        class FakeWorker {
            static latest: FakeWorker
            onmessage: (event: { data: unknown }) => void = () => {}
            onerror: (event: { message: string }) => void = () => {}
            onmessageerror: () => void = () => {}
            postedMessage: unknown
            terminateCalls = 0

            constructor(
                public url: URL,
                public options: WorkerOptions
            ) {
                FakeWorker.latest = this
            }

            postMessage(message: unknown): void {
                this.postedMessage = message
            }

            terminate(): void {
                this.terminateCalls++
            }
        }

        const workerWindow = window as unknown as { Worker: typeof Worker }
        let originalWorker: typeof Worker
        let service: OsmApiService
        let oldGeojson: OsmGoFeatureCollection
        let geojsonChanged: OsmGoFeatureCollection

        beforeEach(() => {
            originalWorker = window.Worker
            workerWindow.Worker = FakeWorker as unknown as typeof Worker
            oldGeojson = {
                type: 'FeatureCollection',
                features: [{ id: 'node/1' }],
            } as OsmGoFeatureCollection
            geojsonChanged = {
                type: 'FeatureCollection',
                features: [{ id: 'node/-1' }],
            } as OsmGoFeatureCollection
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
            vi.useRealTimers()
            workerWindow.Worker = originalWorker
        })

        function startConversion() {
            return service.formatOsmJsonData$(
                '<osm/>',
                oldGeojson,
                geojsonChanged,
                100
            )
        }

        it('resolves a successful structured response', () => {
            let result: unknown
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
                data: {
                    ok: true,
                    data: {
                        geojson: { type: 'FeatureCollection', features: [] },
                        geojsonBbox: {
                            type: 'FeatureCollection',
                            features: [],
                        },
                    },
                },
            })
            expect(result).toEqual({
                geojson: { type: 'FeatureCollection', features: [] },
                geojsonBbox: { type: 'FeatureCollection', features: [] },
            })
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('rejects structurally invalid converted features', () => {
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            FakeWorker.latest.onmessage({
                data: {
                    ok: true,
                    data: {
                        geojson: {
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    id: 'node/1',
                                    geometry: {
                                        type: 'Point',
                                        coordinates: [Number.NaN, 48],
                                    },
                                    properties: {
                                        id: 1,
                                        type: 'node',
                                        tags: { amenity: 'bench' },
                                        meta: { version: 1 },
                                        marker: 'circle-#000000-bench',
                                        icon: 'bench',
                                        hexColor: '#000000',
                                        primaryTag: {
                                            key: 'amenity',
                                            value: 'bench',
                                        },
                                    },
                                },
                            ],
                        },
                        geojsonBbox: {
                            type: 'FeatureCollection',
                            features: [],
                        },
                    },
                },
            })

            expect(resultError?.message).toContain('invalid coordinate')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('rejects an invalid worker response', () => {
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            FakeWorker.latest.onmessage({
                data: { ok: true, data: undefined },
            })
            expect(resultError?.message).toContain('invalid response')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('rejects a conversion exception reported by the worker', () => {
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            FakeWorker.latest.onmessage({
                data: { ok: false, error: 'Conversion failed' },
            })
            expect(resultError?.message).toBe('Conversion failed')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
            expect(oldGeojson).toEqual({
                type: 'FeatureCollection',
                features: [{ id: 'node/1' }],
            })
            expect(geojsonChanged).toEqual({
                type: 'FeatureCollection',
                features: [{ id: 'node/-1' }],
            })
        })

        it('rejects worker errors', () => {
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            FakeWorker.latest.onerror({ message: 'Worker crashed' })
            expect(resultError?.message).toBe('Worker crashed')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('rejects unreadable worker messages', () => {
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            FakeWorker.latest.onmessageerror()
            expect(resultError?.message).toContain('unreadable message')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('terminates a worker that times out', async () => {
            vi.useFakeTimers()
            let resultError: Error | undefined
            startConversion().subscribe({
                error: (error: Error) => (resultError = error),
            })

            await vi.advanceTimersByTimeAsync(30001)

            expect(resultError?.message).toContain('timed out')
            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })

        it('terminates a worker when conversion is cancelled', () => {
            const subscription = startConversion().subscribe()

            subscription.unsubscribe()

            expect(FakeWorker.latest.terminateCalls).toBe(1)
        })
    })
})
