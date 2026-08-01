import { ConfigService } from './config.service'

describe('ConfigService', () => {
    it('invalidates only the changeset id', () => {
        const storage = jasmine.createSpyObj('Storage', ['set'])
        const service = new ConfigService(
            storage,
            {} as any,
            {} as any,
            {} as any
        )
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
        expect(storage.set).toHaveBeenCalledOnceWith(
            'changeset',
            service.changeset
        )
    })
})
