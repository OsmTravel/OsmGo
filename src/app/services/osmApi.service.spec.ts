import { HttpClient } from '@angular/common/http'
import { of } from 'rxjs'

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
})
