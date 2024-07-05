import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { BehaviorSubject, Observable, from, tap } from 'rxjs'
import { Storage } from '@ionic/storage'
import { ConfigService } from './config.service'
import { environment } from '@environments/environment.prod'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

@Injectable({
    providedIn: 'root',
})
export class OsmAuthService {
    oauthParam = {
        prod: {
            url: 'https://www.openstreetmap.org',
            clientId: '-1NG8U9VYF2bMfdgWNHVRbO9LE1gWx_ABmst9egWdBQ',
            secretClient: 'Kxte_brfB0XlrnjFjE8gqR6UMJkdZb_8hzMNQRBicG8',
        },
        dev: {
            url: 'https://master.apis.dev.openstreetmap.org',
            clientId: 'aqB_PKIY18QNLJODai_i4dQzoBlTAEwSxY_258JML0Y',
            secretClient: 'j8HJ2UNWZkg1Pqazitbvys5TiHgkq7DxtyLc1NeRXco',
        },
    }

    private tokenSubject = new BehaviorSubject<string | null>(null)
    public token$ = this.tokenSubject.asObservable()

    constructor(
        private http: HttpClient,
        private configService: ConfigService,
        public localStorage: Storage
    ) {}

    loadToken() {
        this.localStorage
            .get('osmToken')
            .then((val) => {
                if (val) {
                    this.tokenSubject.next(val)
                }
            })
            .catch((err) => {
                console.error(err)
            })
    }

    get redirectUri(): string {
        if (Capacitor.isNativePlatform()) {
            return 'osmgo://auth'
        }
        return window.location.origin + '/'
    }

    get clientId(): string {
        return this.configService.config.isDevServer
            ? this.oauthParam.dev.clientId
            : this.oauthParam.prod.clientId
    }

    get oauthUrl(): string {
        return this.configService.config.isDevServer
            ? 'https://api06.dev.openstreetmap.org/oauth2'
            : 'https://www.openstreetmap.org/oauth2'
    }

    get clientSecret(): string {
        return this.configService.config.isDevServer
            ? this.oauthParam.dev.secretClient
            : this.oauthParam.prod.secretClient
    }

    getLoginUrl(): string {
        const scope = 'read_prefs write_diary write_api write_notes'
        return `${this.oauthUrl}/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scope}`
    }

    login(): Observable<void> {
        return from(Browser.open({ url: this.getLoginUrl() }))
    }

    handleCallback(url: string): Observable<any> {
        const urlParams = new URLSearchParams(url.split('?')[1])
        const code = urlParams.get('code')
        if (code) {
            return this.exchangeCodeForToken(code)
        }
        throw new Error('No code found in callback URL')
    }

    exchangeCodeForToken(code: string): Observable<any> {
        const body = new URLSearchParams()
        body.set('grant_type', 'authorization_code')
        body.set('code', code)
        body.set('redirect_uri', this.redirectUri)
        body.set('client_id', this.clientId)
        body.set('client_secret', this.clientSecret)

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

    setToken(token: string) {
        this.localStorage.set('osmToken', token)
        this.tokenSubject.next(token)
    }

    getToken(): string | null {
        return this.tokenSubject.value
    }

    logout() {
        this.localStorage.remove('osmToken')
        this.tokenSubject.next(null)
        this.localStorage.remove('changeset')
        this.configService.resetUserInfo()
    }

    isAuthenticated(): boolean {
        return !!this.getToken()
    }
}
