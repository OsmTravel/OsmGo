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
        this.runCleanup('map initialization', () =>
            this.initialization?.unsubscribe()
        )
        this.initialization = undefined
        this.runCleanup('map session', () => this.session.unsubscribe())
        this.session = new Subscription()
        for (const cleanup of this.cleanups.splice(0).reverse()) {
            this.runCleanup('map listener', cleanup)
        }
        this.runCleanup('MapLibre instance', () => map?.remove())
    }

    private runCleanup(label: string, cleanup: () => void): void {
        try {
            cleanup()
        } catch (error) {
            console.error(`Could not clean up ${label}.`, error)
        }
    }
}
