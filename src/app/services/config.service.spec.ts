import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { TranslateService } from '@ngx-translate/core'
import { AppStorage } from '@services/app-storage.service'
import { firstValueFrom } from 'rxjs'

import { ConfigService } from './config.service'

describe('ConfigService', () => {
    it('merges stored configuration with current defaults', async () => {
        const storage = {
            get: vi.fn().mockResolvedValue({ limitFeatures: 250 }),
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: storage },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)
        const defaultLanguage = service.config().languageTags

        const config = await firstValueFrom(service.loadConfig$(undefined))

        expect(config.limitFeatures).toBe(250)
        expect(config.languageTags).toBe(defaultLanguage)
        expect(service.config()).toBe(config)
    })

    it('replaces and persists configuration updates', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: storage },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)
        const initialConfig = service.config()

        service.setOldTagsIcon(false, 8)

        expect(service.config()).not.toBe(initialConfig)
        expect(service.config().oldTagsIcon).toEqual({
            display: false,
            year: 8,
        })
        expect(storage.set).toHaveBeenCalledWith('config', service.config())
    })

    it('exposes the application version as read-only state', async () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: {} },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)

        await service.loadAppVersion()

        expect(service.appVersion()).toEqual(service.getAppVersion())
    })

    it('exposes user updates as read-only state', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: storage },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)
        const user = {
            uid: '42',
            display_name: 'Mapper',
            connected: true,
        }

        service.setUserInfo(user)

        expect(service.userInfo()).toEqual(user)
        expect(service.getUserInfo()).toEqual(user)
        expect(storage.set).toHaveBeenCalledWith('user_info', user)
    })

    it('exposes the current zoom as read-only state', () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: {} },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)

        expect(service.currentZoom()).toBeUndefined()

        service.setCurrentZoom(16)

        expect(service.currentZoom()).toBe(16)
    })

    it('invalidates only the changeset id', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: AppStorage, useValue: storage },
                { provide: HttpClient, useValue: {} },
                { provide: TranslateService, useValue: {} },
            ],
        })
        const service = TestBed.inject(ConfigService)
        service.changeset = {
            id: '123',
            created_at: 100,
            last_changeset_activity: 200,
            comment: 'Survey',
        }

        service.invalidateChangeset()

        expect(service.changeset).toEqual({
            id: '',
            created_at: 100,
            last_changeset_activity: 200,
            comment: 'Survey',
        })
        expect(storage.set).toHaveBeenCalledTimes(1)
        expect(storage.set).toHaveBeenCalledWith('changeset', service.changeset)
    })
})
