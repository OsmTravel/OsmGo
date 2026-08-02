import type { Map } from 'maplibre-gl'
import { Subscription, type TeardownLogic } from 'rxjs'

/** Owns resources whose lifetime must match one MapLibre map instance. */
export class MapLifecycleController {
    private initialization?: Subscription
    private session = new Subscription()
    private cleanups: Array<() => void> = []

    get initializationInProgress(): boolean {
        return Boolean(this.initialization && !this.initialization.closed)
    }

    trackInitialization(subscription: Subscription): void {
        this.initialization?.unsubscribe()
        this.initialization = subscription
    }

    trackSession(teardown: TeardownLogic): void {
        this.session.add(teardown)
    }

    trackCleanup(...cleanups: Array<() => void>): void {
        this.cleanups.push(...cleanups)
    }

    destroy(map?: Pick<Map, 'remove'>): void {
        this.initialization?.unsubscribe()
        this.initialization = undefined
        this.session.unsubscribe()
        this.session = new Subscription()
        for (const cleanup of this.cleanups.splice(0).reverse()) {
            cleanup()
        }
        map?.remove()
    }
}
