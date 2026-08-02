import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { Storage } from '@ionic/storage-angular'
import type { OsmGoFeature } from '@osmgo/type'
import { firstValueFrom, of } from 'rxjs'

import { TagsService } from './tags.service'

describe('TagsService', () => {
    it('exposes loaded tag catalog data as read-only signals', async () => {
        const tagsConfig = {
            primaryKeys: ['amenity'],
            tags: [],
        }
        const presets = {
            cafe: { key: 'amenity', tags: { amenity: 'cafe' } },
        }
        const http = {
            get: vi.fn((url: string) =>
                of(url.endsWith('tags.json') ? tagsConfig : presets)
            ),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: Storage, useValue: {} },
            ],
        })
        const service = TestBed.inject(TagsService)

        await firstValueFrom(service.getTagsConfig$())
        await firstValueFrom(service.loadPresets$())

        expect(service.primaryKeys()).toEqual(['amenity'])
        expect(service.presets()).toBe(presets)
    })

    it('exposes tag list preferences as read-only signals', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: Storage, useValue: storage },
            ],
        })
        const service = TestBed.inject(TagsService)

        service.setBookMarksIds(['amenity/cafe'])
        service.setHiddenTagsIds(['highway/path'])
        service.setLastTagsUsedIds(['shop/bakery'])

        expect(service.bookmarksIds()).toEqual(['amenity/cafe'])
        expect(service.hiddenTagsIds()).toEqual(['highway/path'])
        expect(service.lastTagsUsedIds()).toEqual(['shop/bakery'])
        expect(storage.set).toHaveBeenCalledTimes(3)
    })

    it('checks every feature tag when finding the primary tag', async () => {
        const http = {
            get: vi.fn(() => of({ primaryKeys: ['amenity'], tags: [] })),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: Storage, useValue: {} },
            ],
        })
        const service = TestBed.inject(TagsService)
        const feature: OsmGoFeature = {
            type: 'Feature',
            id: 'node/1',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
                hexColor: '',
                icon: '',
                id: 1,
                marker: '',
                meta: {
                    changeset: '',
                    timestamp: '',
                    uid: '',
                    user: '',
                    version: 1,
                },
                primaryTag: { key: 'amenity', value: 'cafe' },
                tags: { name: 'Corner Cafe', amenity: 'cafe' },
                type: 'node',
                originalData: null,
            },
        }

        await firstValueFrom(service.getTagsConfig$())

        expect(service.findPkey(feature)).toEqual({
            key: 'amenity',
            value: 'cafe',
        })
    })
})
