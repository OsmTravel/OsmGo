import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { TranslateModule } from '@ngx-translate/core'
import type { MapMode } from '@osmgo/type'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { of } from 'rxjs'
import { ObjectEditorContentComponent } from './modal'

describe('ObjectEditorContentComponent', () => {
    const genderPreset = {
        type: 'select',
        iDtype: 'radio',
        keys: ['male', 'female', 'unisex'],
        options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
    }
    const tagConfig = {
        id: 'amenity/toilets',
        tags: { amenity: 'toilets' },
        presets: ['gender'],
    }

    function createPage(
        tags: Record<string, string | number>,
        type: MapMode = 'Update'
    ) {
        const feature = {
            type: 'Feature',
            id: 'node/1',
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {
                type: 'node',
                id: 1,
                tags,
                meta: { version: 1 },
            },
        }
        const tagsService = {
            presets: () => ({ gender: genderPreset }),
            tags: () => [tagConfig],
            jsonSprites: () => ({}),
            bookmarksIds: () => [],
            primaryKeys: () => [],
            savedFields: {},
            findPkey: () => ({ key: 'amenity', value: 'toilets' }),
        }
        const nestedDialogRef = {
            componentRef: { setInput: vi.fn() },
            afterClosed: () => of(undefined),
        }
        const dialog = { open: vi.fn(() => nestedDialogRef) }
        const snackBar = { open: vi.fn() }

        TestBed.resetTestingModule()
        TestBed.configureTestingModule({
            imports: [ObjectEditorContentComponent, TranslateModule.forRoot()],
            providers: [
                { provide: OsmApiService, useValue: {} },
                { provide: TagsService, useValue: tagsService },
                { provide: MapService, useValue: {} },
                { provide: DataService, useValue: {} },
                {
                    provide: ConfigService,
                    useValue: {
                        config: () => ({
                            checkedKey: 'survey:date',
                            countryTags: 'US',
                            languageTags: 'en',
                            languageUi: 'en',
                        }),
                    },
                },
                { provide: MatDialog, useValue: dialog },
                { provide: MatSnackBar, useValue: snackBar },
            ],
        })
        const fixture = TestBed.createComponent(ObjectEditorContentComponent)
        fixture.componentRef.setInput('data', feature)
        fixture.componentRef.setInput('type', type)
        fixture.componentRef.setInput('origineData', 'data')
        const page = fixture.componentInstance
        page.ngOnInit()
        return { page, dialog, snackBar, nestedDialogRef }
    }

    it('creates an empty editable field without an undefined key', () => {
        const { page } = createPage({ amenity: 'toilets' })

        page.initComponent(tagConfig as any)

        const genderTag = page.tags.find((tag) => tag.preset === genderPreset)
        expect(genderTag).toEqual({
            key: '',
            value: '',
            preset: genderPreset,
        })
    })

    it('keeps an existing multi-key value and serializes valid tags only', () => {
        const { page } = createPage({
            amenity: 'toilets',
            unisex: 'yes',
        })
        page.initComponent(tagConfig as any)
        page.tags.push({ key: undefined, value: 'unisex' } as any)

        page.pushTagsToFeature()

        expect(page.feature.properties.tags).toEqual({
            amenity: 'toilets',
            unisex: 'yes',
        })
    })

    it('asks the unified sheet to enter update mode from read mode', () => {
        const { page } = createPage({ amenity: 'toilets' }, 'Read')
        const dismissed = vi.fn()
        page.dismissed.subscribe(dismissed)

        page.updateMode()

        expect(dismissed).toHaveBeenCalledWith({ type: 'Edit' })
    })

    it('updates survey tags with a new signal value', () => {
        const { page } = createPage({ amenity: 'toilets' })
        const previousTags = page.tags

        page.addSurveyDate()

        expect(page.tags).not.toBe(previousTags)
        expect(page.tags).toContainEqual({
            key: 'survey:date',
            value: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
    })

    it('emits its result to the unified object sheet', () => {
        const { page } = createPage({ amenity: 'toilets' })
        const result = { redraw: true }
        const dismissed = vi.fn()
        page.dismissed.subscribe(dismissed)

        page.dismiss(result)

        expect(dismissed).toHaveBeenCalledWith(result)
    })

    it('asks the unified sheet to select a category', () => {
        const { page, dialog } = createPage({ amenity: 'toilets' }, 'Update')
        const categoryRequested = vi.fn()
        page.categoryRequested.subscribe(categoryRequested)

        page.openPrimaryTagModal()

        expect(categoryRequested).toHaveBeenCalledOnce()
        expect(dialog.open).not.toHaveBeenCalled()
    })

    it('shows feedback through the Material snackbar', () => {
        const { page, snackBar } = createPage({ amenity: 'toilets' })

        page.presentToast('Unable to save changes.')

        expect(snackBar.open).toHaveBeenCalledWith(
            'Unable to save changes.',
            'SHARED.CLOSE',
            { duration: 4000 }
        )
    })
})
