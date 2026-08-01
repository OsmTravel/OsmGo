import { HttpClient } from '@angular/common/http'
import { Capacitor } from '@capacitor/core'
import { of } from 'rxjs'

import { OsmAuthService } from './osm-auth.service'

describe('OsmAuthService', () => {
    let http: jasmine.SpyObj<HttpClient>
    let storage
    let configService
    let service: OsmAuthService
    let nativePlatform: jasmine.Spy

    beforeEach(() => {
        sessionStorage.clear()
        http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post'])
        storage = jasmine.createSpyObj('Storage', ['get', 'set', 'remove'])
        storage.get.and.resolveTo(null)
        storage.set.and.resolveTo()
        storage.remove.and.resolveTo()
        configService = {
            config: { isDevServer: false },
            resetUserInfo: jasmine.createSpy('resetUserInfo'),
        }
        nativePlatform = spyOn(Capacitor, 'isNativePlatform').and.returnValue(
            false
        )
        service = new OsmAuthService(http, configService as any, storage as any)
    })

    afterEach(() => {
        sessionStorage.clear()
    })

    it('creates a PKCE authorization URL with minimal scopes', async () => {
        const loginUrl = new URL(await service.getLoginUrl())
        const verifier = sessionStorage.getItem('osmOAuthCodeVerifier')
        const state = sessionStorage.getItem('osmOAuthState')

        expect(loginUrl.origin + loginUrl.pathname).toBe(
            'https://www.openstreetmap.org/oauth2/authorize'
        )
        expect(loginUrl.searchParams.get('client_id')).toBe(service.clientId)
        expect(loginUrl.searchParams.get('redirect_uri')).toBe(document.baseURI)
        expect(loginUrl.searchParams.get('response_type')).toBe('code')
        expect(loginUrl.searchParams.get('scope')).toBe('read_prefs write_api')
        expect(loginUrl.searchParams.get('state')).toBe(state)
        expect(loginUrl.searchParams.get('code_challenge_method')).toBe('S256')
        expect(verifier?.length).toBe(43)
        expect(state?.length).toBe(43)
        expect(loginUrl.searchParams.get('code_challenge')).toBe(
            await createCodeChallenge(verifier)
        )
    })

    it('keeps the Android callback on the OSM development server', async () => {
        configService.config.isDevServer = true
        nativePlatform.and.returnValue(true)

        const loginUrl = new URL(await service.getLoginUrl())

        expect(loginUrl.origin + loginUrl.pathname).toBe(
            'https://master.apis.dev.openstreetmap.org/oauth2/authorize'
        )
        expect(loginUrl.searchParams.get('redirect_uri')).toBe('osmgo://auth')
    })

    it('exchanges a valid callback without a client secret', () => {
        sessionStorage.setItem('osmOAuthState', 'expected-state')
        sessionStorage.setItem('osmOAuthCodeVerifier', 'stored-verifier')
        http.post.and.returnValue(of({ access_token: 'access-token' }))

        service
            .handleCallback(
                'https://osmgo.com/?code=authorization-code&state=expected-state'
            )
            .subscribe()

        const [url, rawBody, options] = http.post.calls.mostRecent().args
        const body = new URLSearchParams(rawBody as string)
        const keys = []
        body.forEach((_value, key) => keys.push(key))

        expect(url).toBe('https://www.openstreetmap.org/oauth2/token')
        expect(keys).toEqual([
            'grant_type',
            'code',
            'redirect_uri',
            'client_id',
            'code_verifier',
        ])
        expect(body.get('grant_type')).toBe('authorization_code')
        expect(body.get('code')).toBe('authorization-code')
        expect(body.get('code_verifier')).toBe('stored-verifier')
        expect(body.has('client_secret')).toBeFalse()
        expect((options as any).headers.get('Content-Type')).toBe(
            'application/x-www-form-urlencoded'
        )
        expect(storage.set).toHaveBeenCalledWith('osmToken', 'access-token')
        expect(service.getToken()).toBe('access-token')
        expect(sessionStorage.getItem('osmOAuthState')).toBeNull()
        expect(sessionStorage.getItem('osmOAuthCodeVerifier')).toBeNull()
    })

    it('rejects a callback with an invalid state', () => {
        sessionStorage.setItem('osmOAuthState', 'expected-state')
        sessionStorage.setItem('osmOAuthCodeVerifier', 'stored-verifier')
        let callbackError

        service
            .handleCallback(
                'https://osmgo.com/?code=authorization-code&state=wrong-state'
            )
            .subscribe({ error: (error) => (callbackError = error) })

        expect(callbackError.message).toBe('Invalid OAuth state.')
        expect(http.post).not.toHaveBeenCalled()
        expect(sessionStorage.getItem('osmOAuthState')).toBeNull()
        expect(sessionStorage.getItem('osmOAuthCodeVerifier')).toBeNull()
    })

    it('rejects a callback without an authorization code', () => {
        sessionStorage.setItem('osmOAuthState', 'expected-state')
        sessionStorage.setItem('osmOAuthCodeVerifier', 'stored-verifier')
        let callbackError

        service
            .handleCallback('https://osmgo.com/?state=expected-state')
            .subscribe({ error: (error) => (callbackError = error) })

        expect(callbackError.message).toContain('No authorization code')
        expect(http.post).not.toHaveBeenCalled()
    })

    it('clears the stored token and user information', () => {
        service.setToken('access-token')

        service.clearToken()

        expect(storage.remove).toHaveBeenCalledWith('osmToken')
        expect(service.getToken()).toBeNull()
        expect(configService.resetUserInfo).toHaveBeenCalledTimes(1)
    })

    it('closes the Capacitor browser after the callback', () => {
        nativePlatform.and.returnValue(true)
        const closeNativeBrowser = spyOn<any>(
            service,
            'closeNativeBrowser'
        ).and.callThrough()
        sessionStorage.setItem('osmOAuthState', 'expected-state')
        sessionStorage.setItem('osmOAuthCodeVerifier', 'stored-verifier')
        http.post.and.returnValue(of({ access_token: 'access-token' }))

        service
            .handleCallback(
                'osmgo://auth?code=authorization-code&state=expected-state'
            )
            .subscribe()

        const body = new URLSearchParams(
            http.post.calls.mostRecent().args[1] as string
        )
        expect(body.get('redirect_uri')).toBe('osmgo://auth')
        expect(closeNativeBrowser).toHaveBeenCalledTimes(1)
    })
})

async function createCodeChallenge(verifier: string): Promise<string> {
    const value = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', value)
    let encoded = ''
    for (const byte of new Uint8Array(digest)) {
        encoded += String.fromCharCode(byte)
    }
    return btoa(encoded)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}
