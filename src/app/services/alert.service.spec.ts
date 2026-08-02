import { AlertService } from './alert.service'

describe('AlertService', () => {
    it('publishes alerts through its public command', () => {
        const service = new AlertService()
        const alerts: string[] = []
        service.newAlert$.subscribe((message) => alerts.push(message))

        service.showAlert('Download failed')

        expect(alerts).toEqual(['Download failed'])
    })
})
