import { HttpClient, HttpHeaders } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { Capacitor } from '@capacitor/core'
import { AppStorage } from '@services/app-storage.service'
import { ConfigService } from '@services/config.service'
import { firstValueFrom, NEVER, of, throwError } from 'rxjs'
import type { Mock } from 'vitest'

import { OAUTH_BROWSER, OsmAuthService } from './osm-auth.service'

describe('OsmAuthService', () => {
    let http: { post: Mock }
    let storage: { get: Mock; set: Mock; remove: Mock }
    let configService: {
        config: Mock
        resetUserInfo: Mock
        resetChangeset: Mock
    }
    let service: OsmAuthService
    let nativePlatform: Mock
    let closeBrowser: Mock
    let openBrowser: Mock
    let persistedStorage: Map<string, unknown>

    const callbackUrl = (parameters: Record<string, string>): string => {
        const url = new URL(document.baseURI)
        for (const [key, value] of Object.entries(parameters)) {
            url.searchParams.set(key, value)
        }
        return url.href
    }

    const prepareAuthorization = async (): Promise<{
        state: string
        verifier: string
    }> => {
        const loginUrl = new URL(await service.getLoginUrl())
        const state = loginUrl.searchParams.get('state')
        const rawTransaction = sessionStorage.getItem(
            'osmOAuthTransaction:prod'
        )
        if (!state || !rawTransaction) {
            throw new Error('The OAuth transaction was not prepared.')
        }
        const transaction = JSON.parse(rawTransaction) as {
            verifier: string
        }
        return { state, verifier: transaction.verifier }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        closeBrowser = vi.fn().mockResolvedValue(undefined)
        openBrowser = vi.fn().mockResolvedValue(undefined)
        sessionStorage.clear()
        persistedStorage = new Map()
        http = {
            post: vi.fn().mockName('HttpClient.post'),
        }
        storage = {
            get: vi.fn().mockName('Storage.get'),
            set: vi.fn().mockName('Storage.set'),
            remove: vi.fn().mockName('Storage.remove'),
        }
        storage.get.mockImplementation((key: string) =>
            Promise.resolve(persistedStorage.get(key) ?? null)
        )
        storage.set.mockImplementation((key: string, value: unknown) => {
            persistedStorage.set(key, value)
            return Promise.resolve(undefined)
        })
        storage.remove.mockImplementation((key: string) => {
            persistedStorage.delete(key)
            return Promise.resolve(undefined)
        })
        configService = {
            config: vi.fn(() => ({ isDevServer: false })),
            resetUserInfo: vi.fn().mockName('resetUserInfo'),
            resetChangeset: vi.fn().mockName('resetChangeset'),
        }
        nativePlatform = vi
            .spyOn(Capacitor, 'isNativePlatform')
            .mockReturnValue(false)
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: ConfigService, useValue: configService },
                { provide: AppStorage, useValue: storage },
                {
                    provide: OAUTH_BROWSER,
                    useValue: { close: closeBrowser, open: openBrowser },
                },
            ],
        })
        service = TestBed.runInInjectionContext(() => new OsmAuthService())
    })

    afterEach(() => {
        sessionStorage.clear()
        nativePlatform.mockRestore()
        vi.clearAllMocks()
    })

    it('creates a PKCE authorization URL with minimal scopes', async () => {
        const loginUrl = new URL(await service.getLoginUrl())
        const transaction = JSON.parse(
            sessionStorage.getItem('osmOAuthTransaction:prod') ?? '{}'
        ) as { verifier?: string; state?: string }
        const verifier = transaction.verifier
        const state = transaction.state

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
        if (!verifier) throw new Error('The PKCE verifier was not stored.')
        expect(loginUrl.searchParams.get('code_challenge')).toBe(
            await createCodeChallenge(verifier)
        )
    })

    it('keeps the Android callback on the OSM development server', async () => {
        configService.config.mockReturnValue({ isDevServer: true })
        nativePlatform.mockReturnValue(true)

        const loginUrl = new URL(await service.getLoginUrl())

        expect(loginUrl.origin + loginUrl.pathname).toBe(
            'https://master.apis.dev.openstreetmap.org/oauth2/authorize'
        )
        expect(loginUrl.searchParams.get('redirect_uri')).toBe('osmgo://auth')
    })

    it('recovers a native PKCE transaction after service recreation', async () => {
        nativePlatform.mockReturnValue(true)
        const loginUrl = new URL(await service.getLoginUrl())
        const state = loginUrl.searchParams.get('state')
        if (!state) throw new Error('Missing state fixture.')
        sessionStorage.clear()
        http.post.mockReturnValue(of({ access_token: 'native-token' }))
        const recreated = TestBed.runInInjectionContext(
            () => new OsmAuthService()
        )

        await firstValueFrom(
            recreated.handleCallback(
                `osmgo://auth?code=authorization-code&state=${state}`
            )
        )

        expect(recreated.getToken()).toBe('native-token')
        expect(persistedStorage.has('osmOAuthTransaction:prod')).toBe(false)
    })

    it('rejects an expired native authorization transaction', async () => {
        nativePlatform.mockReturnValue(true)
        const loginUrl = new URL(await service.getLoginUrl())
        const state = loginUrl.searchParams.get('state')
        const transaction = persistedStorage.get(
            'osmOAuthTransaction:prod'
        ) as { createdAt: number }
        transaction.createdAt = Date.now() - 11 * 60 * 1000
        if (!state) throw new Error('Missing state fixture.')

        await expect(
            firstValueFrom(
                service.handleCallback(
                    `osmgo://auth?code=authorization-code&state=${state}`
                )
            )
        ).rejects.toThrow('expired')
        expect(http.post).not.toHaveBeenCalled()
        expect(closeBrowser).toHaveBeenCalledOnce()
    })

    it('keeps production and development tokens isolated', async () => {
        await service.setToken('production-token')
        configService.config.mockReturnValue({ isDevServer: true })
        const developmentService = TestBed.runInInjectionContext(
            () => new OsmAuthService()
        )

        await developmentService.loadToken()
        await developmentService.setToken('development-token')

        expect(persistedStorage.get('osmToken:prod')).toBe('production-token')
        expect(persistedStorage.get('osmToken:dev')).toBe('development-token')
    })

    it('exchanges a valid callback without a client secret', async () => {
        const { state, verifier } = await prepareAuthorization()
        http.post.mockReturnValue(of({ access_token: 'access-token' }))

        await firstValueFrom(
            service.handleCallback(
                callbackUrl({ code: 'authorization-code', state })
            )
        )

        const lastCall = vi.mocked(http.post).mock.lastCall
        expect(lastCall).toBeDefined()
        if (!lastCall) throw new Error('The token endpoint was not called.')
        const [url, rawBody, options] = lastCall
        const body = new URLSearchParams(rawBody as string)
        const keys: string[] = []
        body.forEach((_value, key) => {
            keys.push(key)
        })

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
        expect(body.get('code_verifier')).toBe(verifier)
        expect(body.has('client_secret')).toBe(false)
        expect(
            (options as { headers: HttpHeaders }).headers.get('Content-Type')
        ).toBe('application/x-www-form-urlencoded')
        expect(storage.set).toHaveBeenCalledWith(
            'osmToken:prod',
            'access-token'
        )
        expect(service.getToken()).toBe('access-token')
        expect(sessionStorage.getItem('osmOAuthTransaction:prod')).toBeNull()
    })

    it('consumes an authorization callback only once', async () => {
        const { state } = await prepareAuthorization()
        const url = callbackUrl({ code: 'authorization-code', state })
        http.post.mockReturnValue(of({ access_token: 'access-token' }))

        await firstValueFrom(service.handleCallback(url))
        await expect(
            firstValueFrom(service.handleCallback(url))
        ).rejects.toThrow('Invalid OAuth state.')

        expect(http.post).toHaveBeenCalledOnce()
    })

    it('times out a stalled token exchange', async () => {
        vi.useFakeTimers()
        const { state } = await prepareAuthorization()
        http.post.mockReturnValue(NEVER)
        const callback = firstValueFrom(
            service.handleCallback(
                callbackUrl({ code: 'authorization-code', state })
            )
        )
        const rejected = expect(callback).rejects.toMatchObject({
            name: 'TimeoutError',
        })

        await vi.advanceTimersByTimeAsync(30_001)

        await rejected
        vi.useRealTimers()
    })

    it('rejects a callback with an invalid state', async () => {
        await prepareAuthorization()

        await expect(
            firstValueFrom(
                service.handleCallback(
                    callbackUrl({
                        code: 'authorization-code',
                        state: 'wrong-state',
                    })
                )
            )
        ).rejects.toThrow('Invalid OAuth state.')
        expect(http.post).not.toHaveBeenCalled()
        expect(sessionStorage.getItem('osmOAuthTransaction:prod')).toBeNull()
    })

    it('rejects a callback without an authorization code', async () => {
        const { state } = await prepareAuthorization()

        await expect(
            firstValueFrom(service.handleCallback(callbackUrl({ state })))
        ).rejects.toThrow('No authorization code')
        expect(http.post).not.toHaveBeenCalled()
    })

    it('clears the stored token and user information', async () => {
        await service.setToken('access-token')

        expect(service.token()).toBe('access-token')

        service.clearToken()

        await vi.waitFor(() =>
            expect(storage.remove).toHaveBeenCalledWith('osmToken:prod')
        )
        expect(service.token()).toBeNull()
        expect(service.getToken()).toBeNull()
        expect(configService.resetUserInfo).toHaveBeenCalledTimes(1)
        expect(configService.resetChangeset).toHaveBeenCalledTimes(1)
        expect(storage.remove).not.toHaveBeenCalledWith('changeset')
    })

    it('closes the Capacitor browser after the callback', async () => {
        nativePlatform.mockReturnValue(true)
        const loginUrl = new URL(await service.getLoginUrl())
        const state = loginUrl.searchParams.get('state')
        if (!state) throw new Error('Missing state fixture.')
        http.post.mockReturnValue(of({ access_token: 'access-token' }))

        await firstValueFrom(
            service.handleCallback(
                `osmgo://auth?code=authorization-code&state=${state}`
            )
        )

        const lastCall = vi.mocked(http.post).mock.lastCall
        expect(lastCall).toBeDefined()
        if (!lastCall) throw new Error('The token endpoint was not called.')
        const body = new URLSearchParams(lastCall[1] as string)
        expect(body.get('redirect_uri')).toBe('osmgo://auth')
        expect(closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('closes the Capacitor browser when token exchange fails', async () => {
        nativePlatform.mockReturnValue(true)
        const loginUrl = new URL(await service.getLoginUrl())
        const state = loginUrl.searchParams.get('state')
        if (!state) throw new Error('Missing state fixture.')
        http.post.mockReturnValue(
            throwError(() => new Error('Token exchange failed'))
        )

        await expect(
            firstValueFrom(
                service.handleCallback(
                    `osmgo://auth?code=authorization-code&state=${state}`
                )
            )
        ).rejects.toThrow('Token exchange failed')

        expect(closeBrowser).toHaveBeenCalledTimes(1)
    })

    it('closes the Capacitor browser when the callback is unsubscribed', () => {
        nativePlatform.mockReturnValue(true)
        return service.getLoginUrl().then((loginUrl) => {
            const state = new URL(loginUrl).searchParams.get('state')
            if (!state) throw new Error('Missing state fixture.')
            http.post.mockReturnValue(NEVER)
            const subscription = service
                .handleCallback(
                    `osmgo://auth?code=authorization-code&state=${state}`
                )
                .subscribe()

            expect(closeBrowser).not.toHaveBeenCalled()
            subscription.unsubscribe()
            expect(closeBrowser).toHaveBeenCalledTimes(1)
        })
    })

    it('does not complete the callback before the token is persisted', async () => {
        const { state } = await prepareAuthorization()
        let finishPersistence: (() => void) | undefined
        storage.set.mockReturnValue(
            new Promise<void>((resolve) => {
                finishPersistence = resolve
            })
        )
        http.post.mockReturnValue(of({ access_token: 'access-token' }))
        const completed = vi.fn()

        service
            .handleCallback(callbackUrl({ code: 'authorization-code', state }))
            .subscribe({ complete: completed })

        await Promise.resolve()
        expect(completed).not.toHaveBeenCalled()

        finishPersistence?.()
        await vi.waitFor(() => expect(completed).toHaveBeenCalledTimes(1))
    })

    it('does not let an older token load overwrite a new callback token', async () => {
        let finishLoad: ((value: string | null) => void) | undefined
        storage.get.mockReturnValue(
            new Promise<string | null>((resolve) => {
                finishLoad = resolve
            })
        )
        const loading = service.loadToken()

        await service.setToken('new-access-token')
        finishLoad?.('old-access-token')
        await loading

        expect(service.getToken()).toBe('new-access-token')
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
