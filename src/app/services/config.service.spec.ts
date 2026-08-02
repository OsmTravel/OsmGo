import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { Platform } from '@ionic/angular/standalone'
import { Storage } from '@ionic/storage-angular'
import { TranslateService } from '@ngx-translate/core'

import { ConfigService } from './config.service'

describe('ConfigService', () => {
    it('invalidates only the changeset id', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: Storage, useValue: storage },
                { provide: Platform, useValue: {} },
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
