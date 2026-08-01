import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Storage } from '@ionic/storage'
import { BehaviorSubject, defer, from, Observable } from 'rxjs'
import { finalize, switchMap, tap } from 'rxjs/operators'

import { ConfigService } from './config.service'

const OAUTH_SCOPES = 'read_prefs write_api'
const OAUTH_STATE_KEY = 'osmOAuthState'
const OAUTH_VERIFIER_KEY = 'osmOAuthCodeVerifier'

@Injectable({
    providedIn: 'root',
})
export class OsmAuthService {
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

    private tokenSubject = new BehaviorSubject<string | null>(null)
    public token$ = this.tokenSubject.asObservable()

    constructor(
        private http: HttpClient,
        private configService: ConfigService,
        public localStorage: Storage
    ) {}

    loadToken(): void {
        this.localStorage
            .get('osmToken')
            .then((value) => {
                if (value) {
                    this.tokenSubject.next(value)
                }
            })
            .catch((error) => {
                console.error(error)
            })
    }

    get redirectUri(): string {
        if (Capacitor.isNativePlatform()) {
            return 'osmgo://auth'
        }
        return document.baseURI
    }

    get clientId(): string {
        return this.configService.config.isDevServer
            ? this.oauthParam.dev.clientId
            : this.oauthParam.prod.clientId
    }

    get oauthUrl(): string {
        const server = this.configService.config.isDevServer
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
            switchMap((url) => from(Browser.open({ url })))
        )
    }

    handleCallback(url: string): Observable<any> {
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
        }).pipe(finalize(() => this.closeNativeBrowser()))
    }

    exchangeCodeForToken(code: string, verifier: string): Observable<any> {
        const body = new URLSearchParams()
        body.set('grant_type', 'authorization_code')
        body.set('code', code)
        body.set('redirect_uri', this.redirectUri)
        body.set('client_id', this.clientId)
        body.set('code_verifier', verifier)

        return this.http
            .post(`${this.oauthUrl}/token`, body.toString(), {
                headers: new HttpHeaders().set(
                    'Content-Type',
                    'application/x-www-form-urlencoded'
                ),
            })
            .pipe(
                tap((response: any) => {
                    if (response.access_token) {
                        this.setToken(response.access_token)
                    }
                })
            )
    }

    setToken(token: string): void {
        this.localStorage.set('osmToken', token)
        this.tokenSubject.next(token)
    }

    clearToken(): void {
        this.localStorage.remove('osmToken')
        this.tokenSubject.next(null)
        this.configService.resetUserInfo()
    }

    getToken(): string | null {
        return this.tokenSubject.value
    }

    logout(): void {
        this.clearToken()
        this.localStorage.remove('changeset')
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

    private closeNativeBrowser(): void {
        if (Capacitor.isNativePlatform()) {
            void Browser.close().catch(() => undefined)
        }
    }
}
