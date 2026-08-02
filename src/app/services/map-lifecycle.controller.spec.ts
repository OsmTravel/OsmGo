import type { Map } from 'maplibre-gl'
import { Subscription } from 'rxjs'

import { MapLifecycleController } from './map-lifecycle.controller'

describe('MapLifecycleController', () => {
    it('owns initialization, session, listeners, and map teardown', () => {
        const controller = new MapLifecycleController()
        const initializationTeardown = vi.fn()
        const sessionTeardown = vi.fn()
        const firstCleanup = vi.fn()
        const secondCleanup = vi.fn()
        const remove = vi.fn()

        controller.trackInitialization(new Subscription(initializationTeardown))
        controller.trackSession(new Subscription(sessionTeardown))
        controller.trackCleanup(firstCleanup, secondCleanup)

        expect(controller.initializationInProgress).toBe(true)
        controller.destroy({ remove } as unknown as Map)

        expect(controller.initializationInProgress).toBe(false)
        expect(initializationTeardown).toHaveBeenCalledOnce()
        expect(sessionTeardown).toHaveBeenCalledOnce()
        expect(secondCleanup).toHaveBeenCalledBefore(firstCleanup)
        expect(remove).toHaveBeenCalledOnce()
    })

    it('starts a fresh session after teardown', () => {
        const controller = new MapLifecycleController()
        const firstTeardown = vi.fn()
        const secondTeardown = vi.fn()

        controller.trackSession(new Subscription(firstTeardown))
        controller.destroy()
        controller.trackSession(new Subscription(secondTeardown))
        controller.destroy()

        expect(firstTeardown).toHaveBeenCalledOnce()
        expect(secondTeardown).toHaveBeenCalledOnce()
    })
})
