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
        lbl: { en: 'Gender' },
        keys: ['male', 'female', 'unisex'],
        options: [{ v: 'male' }, { v: 'female' }, { v: 'unisex' }],
    } as any
    const tagConfig = {
        id: 'amenity/toilets',
        lbl: { en: 'Toilets' },
        tags: { amenity: 'toilets' },
        presets: ['gender'],
    }

    function featureWith(id: number, tags: Record<string, string | number>) {
        return {
            type: 'Feature',
            id: `node/${id}`,
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {
                type: 'node',
                id,
                tags,
                meta: {
                    changeset: '1',
                    timestamp: 0,
                    uid: '1',
                    user: 'mapper',
                    version: 1,
                },
            },
        }
    }

    function createPage(
        tags: Record<string, string | number>,
        type: MapMode = 'Update'
    ) {
        const feature = featureWith(1, tags)
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
                {
                    provide: MapService,
                    useValue: { isProcessing: () => false },
                },
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
                        getDisplaySurveyCard: () => 'never',
                        getSurveyCardYear: () => 1,
                        getUiLanguage: () => 'en',
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
        fixture.detectChanges()
        const page = fixture.componentInstance
        return { page, fixture, dialog, snackBar, nestedDialogRef }
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

    it('normalizes numeric values to strings without dropping zero', () => {
        const { page } = createPage({
            amenity: 'toilets',
            level: 0,
            name: '  Ground floor  ',
        })

        page.pushTagsToFeature()

        expect(page.feature.properties.tags).toEqual({
            amenity: 'toilets',
            level: '0',
            name: 'Ground floor',
        })
    })

    it('does not report a change when tags are only reordered', () => {
        const { page } = createPage({
            amenity: 'toilets',
            name: 'Public toilets',
            level: 0,
        })

        page.tags.reverse()

        expect(page.dataIsChanged()).toBe(false)
        expect(page.changedFieldCount()).toBe(0)
    })

    it('merges a multi-key collision and keeps preset metadata', () => {
        const { page } = createPage({
            amenity: 'toilets',
            unisex: 'yes',
            male: 'yes',
        })
        page.initComponent(tagConfig as any)
        const source = page.tags.find((tag) => tag.preset === genderPreset)
        if (!source) throw new Error('Missing gender fixture.')

        page.applyTagSelection({
            source,
            tag: { ...source, key: 'male', value: 'yes' },
        })

        const genderTags = page.tags.filter((tag) => tag.key === 'male')
        expect(genderTags).toHaveLength(1)
        expect(genderTags[0]).toMatchObject({
            value: 'yes',
            preset: genderPreset,
        })
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

    it('resynchronizes cloned and original tags when the read selection changes', () => {
        const { page, fixture } = createPage(
            { amenity: 'toilets', name: 'Object A' },
            'Read'
        )

        fixture.componentRef.setInput(
            'data',
            featureWith(2, { amenity: 'toilets', name: 'Object B' })
        )
        fixture.detectChanges()

        expect(page.feature.id).toBe('node/2')
        expect(page.findElement(page.tags, { key: 'name' }).value).toBe(
            'Object B'
        )
        expect(page.originalTags).toContainEqual({
            key: 'name',
            value: 'Object B',
        })
    })

    it('does not overwrite an edited draft when another feature input arrives', () => {
        const { page, fixture } = createPage({
            amenity: 'toilets',
            name: 'Object A',
        })
        page.findElement(page.tags, { key: 'name' }).value = 'Draft A'

        fixture.componentRef.setInput(
            'data',
            featureWith(2, { amenity: 'toilets', name: 'Object B' })
        )
        fixture.detectChanges()

        expect(page.feature.id).toBe('node/1')
        expect(page.findElement(page.tags, { key: 'name' }).value).toBe(
            'Draft A'
        )
    })
})
