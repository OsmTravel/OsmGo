import { HttpClient, HttpHeaders } from '@angular/common/http'
import { InjectionToken, inject, Service, signal } from '@angular/core'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { AppStorage } from '@services/app-storage.service'
import { defer, from, map, Observable, of } from 'rxjs'
import { finalize, switchMap } from 'rxjs/operators'

import { ConfigService } from './config.service'

const OAUTH_SCOPES = 'read_prefs write_api'
const OAUTH_STATE_KEY = 'osmOAuthState'
const OAUTH_VERIFIER_KEY = 'osmOAuthCodeVerifier'

interface OAuthTokenResponse {
    access_token?: string
    token_type?: string
    scope?: string
    created_at?: number
}

export type OAuthBrowser = Pick<typeof Browser, 'close' | 'open'>

export const OAUTH_BROWSER = new InjectionToken<OAuthBrowser>('OAuth browser', {
    factory: () => Browser,
})

@Service()
export class OsmAuthService {
    private readonly http = inject(HttpClient)
    private readonly configService = inject(ConfigService)
    private readonly browser = inject(OAUTH_BROWSER)
    readonly localStorage = inject(AppStorage)

    oauthParam = {
        prod: {
            url: 'https://www.openstreetmap.org',
            clientId: '-1NG8U9VYF2bMfdgWNHVRbO9LE1gWx_ABmst9egWdBQ',
        },
        dev: {
            url: 'https://master.apis.dev.openstreetmap.org',
            clientId: 'aqB_PKIY18QNLJODai_i4dQzoBlTAEwSxY_258JML0Y',
        },
    }

    private readonly tokenState = signal<string | null>(null)
    readonly token = this.tokenState.asReadonly()
    private tokenRevision = 0
    private tokenPersistence = Promise.resolve()

    async loadToken(): Promise<string | null> {
        const revision = this.tokenRevision
        try {
            const value = await this.localStorage.get<string>('osmToken')
            if (revision === this.tokenRevision && value) {
                this.tokenState.set(value)
            }
        } catch (error) {
            console.error(error)
        }
        return this.token()
    }

    get redirectUri(): string {
        if (Capacitor.isNativePlatform()) {
            return 'osmgo://auth'
        }
        return document.baseURI
    }

    get clientId(): string {
        return this.configService.config().isDevServer
            ? this.oauthParam.dev.clientId
            : this.oauthParam.prod.clientId
    }

    get oauthUrl(): string {
        const server = this.configService.config().isDevServer
            ? this.oauthParam.dev.url
            : this.oauthParam.prod.url
        return `${server}/oauth2`
    }

    async getLoginUrl(): Promise<string> {
        const verifier = this.createRandomValue()
        const state = this.createRandomValue()
        const challenge = await this.createCodeChallenge(verifier)

        sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier)
        sessionStorage.setItem(OAUTH_STATE_KEY, state)

        const parameters = new URLSearchParams()
        parameters.set('client_id', this.clientId)
        parameters.set('redirect_uri', this.redirectUri)
        parameters.set('response_type', 'code')
        parameters.set('scope', OAUTH_SCOPES)
        parameters.set('state', state)
        parameters.set('code_challenge', challenge)
        parameters.set('code_challenge_method', 'S256')

        return `${this.oauthUrl}/authorize?${parameters.toString()}`
    }

    login(): Observable<void> {
        return from(this.getLoginUrl()).pipe(
            switchMap((url) => {
                if (Capacitor.isNativePlatform()) {
                    return from(this.browser.open({ url }))
                }

                // OAuth must stay in the current web tab. Opening a second tab
                // separates the callback from its sessionStorage PKCE verifier
                // and leaves the original OsmGo tab unaware of the new token.
                window.location.assign(url)
                return of(undefined)
            })
        )
    }

    handleCallback(url: string): Observable<OAuthTokenResponse> {
        const shouldCloseBrowser =
            Capacitor.isNativePlatform() ||
            new URL(url, window.location.origin).protocol.startsWith('osmgo')

        return defer(() => {
            const callbackUrl = new URL(url, window.location.origin)
            const code = callbackUrl.searchParams.get('code')
            const state = callbackUrl.searchParams.get('state')
            const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
            const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY)

            this.clearPendingAuthorization()

            if (!code) {
                throw new Error('No authorization code found in callback URL.')
            }
            if (!state || !expectedState || state !== expectedState) {
                throw new Error('Invalid OAuth state.')
            }
            if (!verifier) {
                throw new Error('No PKCE verifier found for this callback.')
            }

            return this.exchangeCodeForToken(code, verifier)
        }).pipe(
            finalize(() => {
                if (shouldCloseBrowser) {
                    void this.closeNativeBrowser()
                }
            })
        )
    }

    exchangeCodeForToken(
        code: string,
        verifier: string
    ): Observable<OAuthTokenResponse> {
        const body = new URLSearchParams()
        body.set('grant_type', 'authorization_code')
        body.set('code', code)
        body.set('redirect_uri', this.redirectUri)
        body.set('client_id', this.clientId)
        body.set('code_verifier', verifier)

        return this.http
            .post<OAuthTokenResponse>(
                `${this.oauthUrl}/token`,
                body.toString(),
                {
                    headers: new HttpHeaders().set(
                        'Content-Type',
                        'application/x-www-form-urlencoded'
                    ),
                }
            )
            .pipe(
                switchMap((response) => {
                    if (!response.access_token) {
                        throw new Error(
                            'OpenStreetMap returned no OAuth access token.'
                        )
                    }

                    return from(this.setToken(response.access_token)).pipe(
                        map(() => response)
                    )
                })
            )
    }

    async setToken(token: string): Promise<void> {
        const previousToken = this.token()
        const revision = ++this.tokenRevision
        this.tokenState.set(token)

        try {
            await this.queueTokenPersistence(() =>
                this.localStorage.set('osmToken', token)
            )
        } catch (error) {
            if (revision === this.tokenRevision) {
                this.tokenState.set(previousToken)
            }
            throw error
        }
    }

    clearToken(): void {
        this.tokenRevision++
        this.tokenState.set(null)
        void this.queueTokenPersistence(() =>
            this.localStorage.remove('osmToken')
        ).catch((error) => {
            console.error(error)
        })
        this.configService.resetUserInfo()
        this.configService.resetChangeset()
    }

    getToken(): string | null {
        return this.token()
    }

    logout(): void {
        this.clearToken()
    }

    isAuthenticated(): boolean {
        return !!this.getToken()
    }

    private createRandomValue(): string {
        const bytes = crypto.getRandomValues(new Uint8Array(32))
        return this.toBase64Url(bytes)
    }

    private async createCodeChallenge(verifier: string): Promise<string> {
        const value = new TextEncoder().encode(verifier)
        const digest = await crypto.subtle.digest('SHA-256', value)
        return this.toBase64Url(new Uint8Array(digest))
    }

    private toBase64Url(bytes: Uint8Array): string {
        let value = ''
        for (const byte of bytes) {
            value += String.fromCharCode(byte)
        }
        return btoa(value)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    }

    private clearPendingAuthorization(): void {
        sessionStorage.removeItem(OAUTH_STATE_KEY)
        sessionStorage.removeItem(OAUTH_VERIFIER_KEY)
    }

    private queueTokenPersistence(
        operation: () => Promise<unknown>
    ): Promise<void> {
        const persistence = this.tokenPersistence
            .catch(() => undefined)
            .then(operation)
            .then(() => undefined)
        this.tokenPersistence = persistence.catch(() => undefined)
        return persistence
    }

    private async closeNativeBrowser(): Promise<void> {
        await this.browser.close().catch(() => undefined)
    }
}
