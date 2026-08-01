import { HttpClient } from '@angular/common/http'
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing'
import { NEVER, Observable, of } from 'rxjs'

import { OsmApiService } from './osmApi.service'

describe('OsmApiService', () => {
    it('escapes every changeset XML attribute value', () => {
        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['put'])
        http.put.and.returnValue(of('123'))

        const configService = {
            getAppFullVersion: () => `OsmGo's & "mobile" <app>`,
            getIsDevServer: () => false,
            setChangeset: jasmine.createSpy('setChangeset'),
        }
        const osmAuthService = {
            getToken: () => 'token',
            oauthParam: {
                dev: { url: 'https://api06.dev.openstreetmap.org' },
                prod: { url: 'https://api.openstreetmap.org' },
            },
        }
        const service = new OsmApiService(
            {} as any,
            http,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            configService as any,
            {} as any,
            osmAuthService as any
        )
        spyOnProperty(navigator, 'language', 'get').and.returnValue(
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
        expect(http.put.calls.mostRecent().args[1]).toBe(expectedBody)
    })

    describe('request timeouts', () => {
        let http: jasmine.SpyObj<HttpClient>
        let service: OsmApiService

        beforeEach(() => {
            http = jasmine.createSpyObj<HttpClient>('HttpClient', [
                'get',
                'put',
                'post',
            ])
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
            service = new OsmApiService(
                {} as any,
                http,
                {} as any,
                {} as any,
                {} as any,
                {} as any,
                configService as any,
                {} as any,
                osmAuthService as any
            )
        })

        function expectRequestToTimeOut(request: Observable<unknown>): void {
            let requestError
            request.subscribe({ error: (error) => (requestError = error) })

            tick(30_001)

            expect(requestError?.name).toBe('TimeoutError')
        }

        it('times out user verification', fakeAsync(() => {
            spyOn(console, 'error')
            http.get.and.returnValue(NEVER)

            expectRequestToTimeOut(service.getUserDetail$())
        }))

        it('times out changeset creation', fakeAsync(() => {
            http.put.and.returnValue(NEVER)

            expectRequestToTimeOut(service.createOSMChangeSet('Survey'))
        }))

        it('times out diff uploads', fakeAsync(() => {
            http.post.and.returnValue(NEVER)

            expectRequestToTimeOut(
                service.apiOsmSendOsmDiffFile('<osmChange/>', '123')
            )
        }))
    })

    describe('OSM data worker', () => {
        class FakeWorker {
            static latest: FakeWorker
            onmessage
            onerror
            onmessageerror
            postedMessage
            terminateCalls = 0

            constructor(public url: string) {
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
                tags: [{ key: 'amenity' }],
                primaryKeys: ['amenity'],
            }
            service = new OsmApiService(
                {} as any,
                {} as any,
                {} as any,
                tagsService as any,
                dataService as any,
                {} as any,
                {} as any,
                {} as any,
                {} as any
            )
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

            expect(FakeWorker.latest.url).toBe(
                'assets/workers/worker-formatOsmData.js'
            )
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

            tick(30_001)
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
