import { HttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import type { OsmGoFeature } from '@osmgo/type'
import { AppStorage } from '@services/app-storage.service'
import { firstValueFrom, forkJoin, of } from 'rxjs'

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
                { provide: AppStorage, useValue: {} },
            ],
        })
        const service = TestBed.inject(TagsService)

        await firstValueFrom(service.getTagsConfig$())
        await firstValueFrom(service.loadPresets$())

        expect(service.primaryKeys()).toEqual(['amenity'])
        expect(service.presets()).toBe(presets)
    })

    it('loads and caches the separate brand catalog only on demand', async () => {
        const basePresets = {
            name: { key: 'name', lbl: { en: 'Name' }, type: 'text' },
        }
        const brandPresets = {
            'shop#books#brand': {
                key: 'brand',
                lbl: { en: 'Brand' },
                type: 'list',
                options: [],
            },
        }
        const http = {
            get: vi.fn((url: string) =>
                of(
                    url.endsWith('brandPresets.json')
                        ? brandPresets
                        : basePresets
                )
            ),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: AppStorage, useValue: {} },
            ],
        })
        const service = TestBed.inject(TagsService)

        await firstValueFrom(service.loadPresets$())
        expect(service.presets()['shop#books#brand']).toBeUndefined()
        expect(service.brandPresetsLoaded()).toBe(false)

        await firstValueFrom(
            forkJoin([service.loadBrandPresets$(), service.loadBrandPresets$()])
        )

        expect(service.brandPresetsLoaded()).toBe(true)
        expect(service.presets()).toMatchObject({
            name: basePresets.name,
            'shop#books#brand': brandPresets['shop#books#brand'],
        })
        expect(
            http.get.mock.calls.filter(([url]) =>
                String(url).endsWith('brandPresets.json')
            )
        ).toHaveLength(1)

        await firstValueFrom(service.loadBrandPresets$())
        expect(http.get).toHaveBeenCalledTimes(2)
    })

    it('exposes tag list preferences as read-only signals', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: AppStorage, useValue: storage },
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
                { provide: AppStorage, useValue: {} },
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

    it('removes a tag from hidden preferences when bookmarking it', () => {
        const storage = {
            set: vi.fn().mockName('Storage.set'),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: AppStorage, useValue: storage },
            ],
        })
        const service = TestBed.inject(TagsService)
        const tag = {
            id: 'amenity/cafe',
            tags: { amenity: 'cafe' },
        } as any
        service.setHiddenTagsIds([tag.id])

        service.addBookMark(tag)

        expect(service.hiddenTagsIds()).toEqual([])
        expect(service.bookmarksIds()).toEqual([tag.id])
        expect(storage.set).toHaveBeenCalledWith('hiddenTagsIds', [])
        expect(storage.set).toHaveBeenCalledWith('bookmarksIds', [tag.id])
    })

    it.each([
        ['bookmarks first', true],
        ['hidden tags first', false],
    ])(
        'restores disjoint bookmark and hidden sets with %s',
        async (_, bookmarksFirst) => {
            const storage = {
                get: vi.fn((key: string) =>
                    Promise.resolve(
                        key === 'bookmarksIds'
                            ? ['amenity/cafe']
                            : ['amenity/cafe', 'highway/path']
                    )
                ),
                set: vi.fn(),
            }
            TestBed.configureTestingModule({
                providers: [
                    { provide: HttpClient, useValue: {} },
                    { provide: AppStorage, useValue: storage },
                ],
            })
            const service = TestBed.inject(TagsService)

            if (bookmarksFirst) {
                await firstValueFrom(service.loadBookMarksIds$())
                await firstValueFrom(service.loadHiddenTagsIds$())
            } else {
                await firstValueFrom(service.loadHiddenTagsIds$())
                await firstValueFrom(service.loadBookMarksIds$())
            }

            expect(service.bookmarksIds()).toEqual(['amenity/cafe'])
            expect(service.hiddenTagsIds()).toEqual(['highway/path'])
        }
    )

    it('clones a user tag before applying local defaults', () => {
        const storage = { set: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: {} },
                { provide: AppStorage, useValue: storage },
            ],
        })
        const service = TestBed.inject(TagsService)
        const input = {
            id: 'amenity/custom',
            tags: { amenity: 'custom' },
            geometry: ['point'],
            icon: 'original-icon',
            markerColor: '#ffffff',
        } as any

        service.addUserTags(input)

        expect(input).toMatchObject({
            geometry: ['point'],
            icon: 'original-icon',
            markerColor: '#ffffff',
        })
        expect(service.userTags[0]).not.toBe(input)
        expect(service.userTags[0].tags).not.toBe(input.tags)
        expect(service.userTags[0]).toMatchObject({
            geometry: ['point', 'vertex', 'line', 'area'],
            icon: 'maki-circle-custom',
            markerColor: '#000000',
        })
    })

    it('keeps built-in tag definitions authoritative when user IDs collide', async () => {
        const builtIn = {
            id: 'amenity/cafe',
            tags: { amenity: 'cafe' },
            icon: 'built-in',
        }
        const userDuplicate = {
            id: 'amenity/cafe',
            tags: { amenity: 'cafe' },
            icon: 'user',
        }
        const userOnly = {
            id: 'amenity/custom',
            tags: { amenity: 'custom' },
            icon: 'user-only',
        }
        const http = {
            get: vi.fn(() => of({ primaryKeys: ['amenity'], tags: [builtIn] })),
        }
        const storage = {
            get: vi.fn(() => Promise.resolve([userDuplicate, userOnly])),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: AppStorage, useValue: storage },
            ],
        })
        const service = TestBed.inject(TagsService)

        const tags = await firstValueFrom(service.loadTags$())

        expect(tags).toEqual([builtIn, userOnly])
        expect(service.tags()).toEqual([builtIn, userOnly])
        expect(service.tagsById()).toEqual({
            'amenity/cafe': builtIn,
            'amenity/custom': userOnly,
        })
        expect(service.catalogMetrics().tags).toMatchObject({
            characters: expect.any(Number),
            downloadMs: expect.any(Number),
            parseMs: expect.any(Number),
            indexMs: expect.any(Number),
        })
    })
})
