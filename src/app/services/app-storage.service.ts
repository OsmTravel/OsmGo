import { Injectable } from '@angular/core'
import localForage from 'localforage'

/**
 * Persistent key/value storage shared by the web and Capacitor builds.
 *
 * The database and store names intentionally match Ionic Storage defaults so
 * existing OsmGo installations keep their settings, edits and authentication.
 */
@Injectable({ providedIn: 'root' })
export class AppStorage {
    private readonly database: LocalForage = localForage.createInstance({
        name: '_ionicstorage',
        storeName: '_ionickv',
        driver: [localForage.INDEXEDDB, localForage.LOCALSTORAGE],
    })

    async ready(): Promise<void> {
        await this.database.ready()
    }

    get<T = any>(key: string): Promise<T | null> {
        return this.database.getItem<T>(key)
    }

    set<T>(key: string, value: T): Promise<T> {
        return this.database.setItem(key, value)
    }

    remove(key: string): Promise<void> {
        return this.database.removeItem(key)
    }

    clear(): Promise<void> {
        return this.database.clear()
    }

    keys(): Promise<string[]> {
        return this.database.keys()
    }
}
