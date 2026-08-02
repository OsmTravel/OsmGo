import { TestBed } from '@angular/core/testing'
import {
    AlertController,
    LoadingController,
    ModalController,
    Platform,
    ToastController,
} from '@ionic/angular/standalone'
import { TranslateModule } from '@ngx-translate/core'
import { AlertService } from '@services/alert.service'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { TagsService } from '@services/tags.service'
import { ModalsContentPage } from './modal'
import { ModalPrimaryTag } from './modal.primaryTag/modal.primaryTag'

describe('ModalsContentPage', () => {
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
        tags,
        {
            type = 'Update',
            modalCtrl = {
                create: vi.fn(),
                dismiss: vi.fn(),
            },
            alertCtrl = { create: vi.fn() },
            toastCtrl = { create: vi.fn() },
        }: any = {}
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
            presets: { gender: genderPreset },
            tags: [],
            savedFields: {},
            findPkey: () => ({ key: 'amenity', value: 'toilets' }),
        }
        TestBed.resetTestingModule()
        TestBed.configureTestingModule({
            imports: [ModalsContentPage, TranslateModule.forRoot()],
            providers: [
                { provide: Platform, useValue: {} },
                { provide: LoadingController, useValue: {} },
                { provide: OsmApiService, useValue: {} },
                { provide: TagsService, useValue: tagsService },
                { provide: ModalController, useValue: modalCtrl },
                { provide: MapService, useValue: {} },
                { provide: DataService, useValue: {} },
                {
                    provide: ConfigService,
                    useValue: {
                        config: {
                            countryTags: 'US',
                            languageTags: 'en',
                            languageUi: 'en',
                        },
                    },
                },
                { provide: AlertService, useValue: {} },
                { provide: ToastController, useValue: toastCtrl },
                { provide: AlertController, useValue: alertCtrl },
            ],
        })
        const fixture = TestBed.createComponent(ModalsContentPage)
        fixture.componentRef.setInput('data', feature)
        fixture.componentRef.setInput('type', type)
        fixture.componentRef.setInput('origineData', 'data')
        const page = fixture.componentInstance
        page.ngOnInit()
        return {
            page,
            modalCtrl,
            alertCtrl,
            toastCtrl,
        }
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

    it('changes from read mode to update mode', () => {
        const { page } = createPage({ amenity: 'toilets' }, { type: 'Read' })
        page.initComponent(tagConfig as any)

        page.updateMode()

        expect(page.mode).toBe('Update')
        expect(page.typeFiche).toBe('Edit')
    })

    it('dismisses the feature modal with its result', () => {
        const { page, modalCtrl } = createPage({ amenity: 'toilets' })
        const result = { redraw: true }

        page.dismiss(result)

        expect(modalCtrl.dismiss).toHaveBeenCalledWith(result)
    })

    it('opens the primary tag modal with the current feature data', async () => {
        const primaryTagModal = {
            present: vi.fn().mockResolvedValue(undefined),
            onDidDismiss: vi.fn().mockResolvedValue({ data: undefined }),
        }
        const modalCtrl = {
            create: vi.fn().mockResolvedValue(primaryTagModal),
            dismiss: vi.fn(),
        }
        const { page } = createPage({ amenity: 'toilets' }, { modalCtrl })
        page.initComponent(tagConfig as any)

        await page.openPrimaryTagModal()

        expect(modalCtrl.create).toHaveBeenCalledWith({
            component: ModalPrimaryTag,
            componentProps: {
                geojson: page.feature,
                tagConfig: page.tagConfig,
                tags: page.tags,
                geometryType: 'point',
            },
        })
        expect(primaryTagModal.present).toHaveBeenCalledOnce()
    })

    it('presents a confirmation alert', async () => {
        const alert = { present: vi.fn().mockResolvedValue(undefined) }
        const alertCtrl = { create: vi.fn().mockResolvedValue(alert) }
        const { page } = createPage({ amenity: 'toilets' }, { alertCtrl })

        page.presentConfirm(page.feature)

        await vi.waitFor(() => expect(alert.present).toHaveBeenCalledOnce())
        expect(alertCtrl.create).toHaveBeenCalledWith(
            expect.objectContaining({
                header: 'MODAL_SELECTED_ITEM.DELETE_CONFIRM_HEADER',
                message: 'MODAL_SELECTED_ITEM.DELETE_CONFIRM_MESSAGE',
            })
        )
    })

    it('presents a toast message', async () => {
        const toast = { present: vi.fn().mockResolvedValue(undefined) }
        const toastCtrl = { create: vi.fn().mockResolvedValue(toast) }
        const { page } = createPage({ amenity: 'toilets' }, { toastCtrl })

        await page.presentToast('Unable to save changes.')

        expect(toastCtrl.create).toHaveBeenCalledWith({
            message: 'Unable to save changes.',
            duration: 4000,
            position: 'bottom',
            buttons: [expect.objectContaining({ text: 'X', role: 'cancel' })],
        })
        expect(toast.present).toHaveBeenCalledOnce()
    })
})
