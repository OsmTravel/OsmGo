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
            changeDetectorRef = { detectChanges: vi.fn() },
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
        const params = {
            data: {
                data: feature,
                type,
                origineData: 'data',
            },
        }
        const tagsService = {
            presets: { gender: genderPreset },
            tags: [],
            savedFields: {},
            findPkey: () => ({ key: 'amenity', value: 'toilets' }),
        }
        const page = new ModalsContentPage(
            {} as any,
            params as any,
            {} as any,
            {} as any,
            tagsService as any,
            modalCtrl as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            toastCtrl as any,
            alertCtrl as any,
            { run: (callback) => callback() } as any,
            { instant: (key) => key } as any,
            changeDetectorRef as any
        )
        return {
            page,
            modalCtrl,
            alertCtrl,
            toastCtrl,
            changeDetectorRef,
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
        const changeDetectorRef = { detectChanges: vi.fn() }
        const { page } = createPage(
            { amenity: 'toilets' },
            { modalCtrl, changeDetectorRef }
        )
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
        await vi.waitFor(() =>
            expect(changeDetectorRef.detectChanges).toHaveBeenCalledOnce()
        )
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
