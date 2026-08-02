import {
    Component,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { AlertComponent } from '@components/modal/components/alert/alert.component'
import { EditOtherTag } from '@components/modal/components/edit/OtherTag.component'
import { EditPresets } from '@components/modal/components/edit/Presets.component'
import { MetaCard } from '@components/modal/components/meta-card/MetaCard'
import { PrimaryKey } from '@components/modal/components/primary-key/PrimaryKey'
import { ReadOtherTag } from '@components/modal/components/read/OtherTag.component'
import { ReadPresets } from '@components/modal/components/read/Presets.component'
import { SurveyCard } from '@components/modal/components/survey-card/SurveyCard'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import {
    type FeatureIdSource,
    type MapMode,
    OsmGoFeature,
    Preset,
    PrimaryTag,
    Tag,
    TagConfig,
} from '@osmgo/type'
import { FilterExcludeKeysPipe } from '@pipes/filterExcludeKeys.pipe'
import { IsBookmarkedPipe } from '@pipes/is-bookmarked.pipe'
import { OrderByPresetPipe } from '@pipes/orderByPreset.pipe'
import { getConfigTag } from '@scripts/osmToOsmgo/index.js'
import { ConfigService } from '@services/config.service'
import { DataService } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService } from '@services/osmApi.service'
import { type SavedField, TagsService } from '@services/tags.service'
import type { Geometry } from 'geojson'
import { cloneDeep, findIndex, isEqual } from 'lodash'
import { finalize } from 'rxjs/operators'
import { ModalAddTag } from './modal.addTag/modal.addTag'
import { ModalSelectList } from './modalSelectList/modalSelectList'

export interface ModalDismissData {
    redraw?: boolean
    type?: string
    geojson?: OsmGoFeature
    mode?: MapMode
    deleted?: boolean
    origineData?: FeatureIdSource
}

interface SelectedTagConfig extends TagConfig {
    addTags?: Record<string, string | number>
}

interface ModalSelectListResult {
    key: string
    value: string | number
    tags?: Record<string, string | number>
}

interface DeprecatedTags {
    old: Record<string, unknown>
    replace: Record<string, string | number>
}
@Component({
    selector: 'app-object-editor-content',
    templateUrl: './modal.html',
    styleUrls: ['./modal.scss'],
    imports: [
        AlertComponent,
        EditOtherTag,
        EditPresets,
        FilterExcludeKeysPipe,
        FormsModule,
        IsBookmarkedPipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatTooltipModule,
        MetaCard,
        OrderByPresetPipe,
        PrimaryKey,
        ReadOtherTag,
        ReadPresets,
        SurveyCard,
        TranslateModule,
    ],
})
export class ObjectEditorContentComponent {
    readonly osmApi = inject(OsmApiService)
    readonly tagsService = inject(TagsService)
    readonly mapService = inject(MapService)
    readonly dataService = inject(DataService)
    readonly configService = inject(ConfigService)
    private readonly translate = inject(TranslateService)
    private readonly dialog = inject(MatDialog)
    private readonly snackBar = inject(MatSnackBar)

    private readonly tagsState = signal<Tag[]>([])
    get tags(): Tag[] {
        return this.tagsState()
    }

    originalTags: Tag[] = []
    private readonly featureState = signal<OsmGoFeature | undefined>(undefined)
    get feature(): OsmGoFeature {
        const feature = this.featureState()
        if (!feature) {
            throw new Error('The feature input has not been initialized.')
        }
        return feature
    }

    origineData: FeatureIdSource = 'data'
    private readonly typeFicheState = signal<'Loading' | 'Edit' | 'Read'>(
        'Loading'
    )
    get typeFiche(): 'Loading' | 'Edit' | 'Read' {
        return this.typeFicheState()
    }

    private readonly displayCodeState = signal(false)
    get displayCode(): boolean {
        return this.displayCodeState()
    }

    private readonly modeState = signal<MapMode>('Read')
    get mode(): MapMode {
        return this.modeState()
    }

    private readonly tagConfigState = signal<TagConfig | undefined>(undefined)
    get tagConfig(): TagConfig {
        const tagConfig = this.tagConfigState()
        if (!tagConfig) {
            throw new Error('The tag configuration has not been initialized.')
        }
        return tagConfig
    }

    currentTagConfig(): TagConfig | undefined {
        return this.tagConfigState()
    }

    primaryKey: PrimaryTag = { key: '', value: '' }
    private readonly savedFieldsState = signal<SavedField | undefined>(
        undefined
    )
    get savedFields(): SavedField | undefined {
        return this.savedFieldsState()
    }

    private readonly tagIdState = signal('')
    get tagId(): string {
        return this.tagIdState()
    }

    geometryType: 'point' | 'vertex' | 'line' | 'area' = 'point'
    openPrimaryTagModalOnStart = false
    customValue = ''

    newPosition = false
    presetsIds: string[] = []

    private readonly lastSurveyState = signal<Date | undefined>(undefined)
    get lastSurvey(): Date | undefined {
        return this.lastSurveyState()
    }
    readonly dataInput = input.required<OsmGoFeature>({ alias: 'data' })
    readonly modeInput = input.required<MapMode>({ alias: 'type' })
    readonly newPositionInput = input(false, {
        alias: 'newPosition',
    })
    readonly origineDataInput = input<FeatureIdSource>('data', {
        alias: 'origineData',
    })
    readonly openPrimaryTagModalOnStartInput = input(false, {
        alias: 'openPrimaryTagModalOnStart',
    })
    readonly displayCodeOnStart = input(false)
    readonly dismissed = output<ModalDismissData | undefined>()
    readonly categoryRequested = output<void>()
    private initializedData?: OsmGoFeature
    private initializedMode?: MapMode
    private initializedNewPosition?: boolean
    private initializedOrigin?: FeatureIdSource
    private initializedOpenCategory?: boolean
    private initializedDisplayCode?: boolean

    constructor() {
        effect(() => {
            const data = this.dataInput()
            const mode = this.modeInput()
            const newPosition = this.newPositionInput()
            const origin = this.origineDataInput()
            const openCategory = this.openPrimaryTagModalOnStartInput()
            const displayCode = this.displayCodeOnStart()

            untracked(() => {
                this.synchronizeInputs({
                    data,
                    mode,
                    newPosition,
                    origin,
                    openCategory,
                    displayCode,
                })
            })
        })
    }

    private synchronizeInputs(inputs: {
        data: OsmGoFeature
        mode: MapMode
        newPosition: boolean
        origin: FeatureIdSource
        openCategory: boolean
        displayCode: boolean
    }): void {
        const unchanged =
            this.initializedData === inputs.data &&
            this.initializedMode === inputs.mode &&
            this.initializedNewPosition === inputs.newPosition &&
            this.initializedOrigin === inputs.origin &&
            this.initializedOpenCategory === inputs.openCategory &&
            this.initializedDisplayCode === inputs.displayCode
        if (unchanged) return

        const currentFeature = this.featureState()
        const wouldOverwriteDraft =
            currentFeature !== undefined &&
            (this.mode === 'Update' || this.mode === 'Create') &&
            this.dataIsChanged() &&
            (this.initializedData !== inputs.data ||
                this.initializedMode !== inputs.mode ||
                this.initializedNewPosition !== inputs.newPosition ||
                this.initializedOrigin !== inputs.origin)

        // The parent normally blocks selection changes while editing. Keep that
        // invariant locally as well so an unexpected input cannot erase a draft.
        if (wouldOverwriteDraft) return

        this.initializedData = inputs.data
        this.initializedMode = inputs.mode
        this.initializedNewPosition = inputs.newPosition
        this.initializedOrigin = inputs.origin
        this.initializedOpenCategory = inputs.openCategory
        this.initializedDisplayCode = inputs.displayCode
        this.initializeFromInputs(inputs)
        this.initComponent()
        if (this.mode === 'Create' && this.openPrimaryTagModalOnStart) {
            this.openPrimaryTagModal()
        }
    }

    private initializeFromInputs(inputs: {
        data: OsmGoFeature
        mode: MapMode
        newPosition: boolean
        origin: FeatureIdSource
        openCategory: boolean
        displayCode: boolean
    }): void {
        this.displayCodeState.set(inputs.displayCode)
        this.newPosition = inputs.newPosition
        this.featureState.set(cloneDeep(inputs.data))

        const originalFeatureGeometry: Geometry = this.feature.properties
            .way_geometry
            ? this.feature.properties.way_geometry
            : this.feature.geometry

        const typeGeomFeature = originalFeatureGeometry.type
        const usedByWays = this.feature.properties.usedByWays
        const usedByWay =
            usedByWays === true ||
            (Array.isArray(usedByWays) && usedByWays.length > 0)
        if (typeGeomFeature === 'Point' && !usedByWay) {
            this.geometryType = 'point'
        } else if (typeGeomFeature === 'Point' && usedByWay) {
            this.geometryType = 'vertex'
        } else if (
            typeGeomFeature === 'LineString' ||
            typeGeomFeature === 'MultiLineString'
        ) {
            this.geometryType = 'line'
        } else if (
            typeGeomFeature === 'Polygon' ||
            typeGeomFeature === 'MultiPolygon'
        ) {
            this.geometryType = 'area'
        } else {
            throw new Error('The feature geometry is not supported.')
        }

        this.modeState.set(inputs.mode)
        this.openPrimaryTagModalOnStart = inputs.openCategory
        this.origineData = inputs.origin
        this.typeFicheState.set('Loading')

        const surveyDates: Date[] = []
        const tags: Tag[] = []

        for (const tag in this.feature.properties.tags) {
            const preset = this.tagsService.presets()[tag.replace(':', '/')]
            const data: Tag = {
                key: tag,
                value: this.feature.properties.tags[tag],
            }
            if (preset) data.preset = preset
            tags.push(data)

            if (['survey:date', 'check_date'].includes(tag)) {
                const surveyValue = new Date(this.feature.properties.tags[tag])
                surveyValue.setHours(0, 0, 0, 0)
                surveyDates.push(surveyValue)
            }
        }

        this.lastSurveyState.set(
            surveyDates.length > 0
                ? surveyDates.reduce((pr, cu) => {
                      return cu > pr ? cu : pr
                  })
                : undefined
        )

        this.tagsState.set(tags)
        this.originalTags = cloneDeep(tags)
    }

    presentConfirm(): void {
        const data: ConfirmDialogData = {
            title: this.translate.instant(
                'MODAL_SELECTED_ITEM.DELETE_CONFIRM_HEADER'
            ),
            message: this.translate.instant(
                'MODAL_SELECTED_ITEM.DELETE_CONFIRM_MESSAGE'
            ),
            cancelLabel: this.translate.instant('SHARED.CANCEL'),
            confirmLabel: this.translate.instant('SHARED.CONFIRM'),
            destructive: true,
        }
        this.dialog
            .open(ConfirmDialogComponent, {
                data,
                maxWidth: 'calc(100vw - 32px)',
                panelClass: 'osmgo-dialog',
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.deleteOsmElement()
                }
            })
    }

    initComponent(tagConfig?: TagConfig): {
        tagConfig: TagConfig
        tags: Tag[]
        feature: OsmGoFeature
    } {
        let _tags = this.tags.map((tag) => ({ ...tag }))
        const feature = cloneDeep(this.feature)
        let _tagConfig: TagConfig
        let _tagId: string
        let _presetsIds: string[]

        const _primaryKey = this.tagsService.findPkey(_tags)
        if (!_primaryKey) {
            throw new Error(
                'The feature does not have a supported primary tag.'
            )
        }

        feature.properties.primaryTag = _primaryKey
        this.typeFicheState.set(
            this.mode === 'Update' || this.mode === 'Create' ? 'Edit' : 'Read'
        )

        _tags = _tags.filter(
            (tag) => tag.value && tag.value !== '' && !tag.isDefaultValue
        )
        if (!_tags.find((tag) => tag.key === 'name')) {
            _tags.push({ key: 'name', value: '' })
        }

        if (!tagConfig) {
            _tagConfig = getConfigTag(feature, this.tagsService.tags())
        } else {
            _tagConfig = tagConfig
        }

        _tagId =
            _tagConfig && _tagConfig.id
                ? _tagConfig.id
                : `${_primaryKey.key}/${_primaryKey.value}`
        this.savedFieldsState.set(this.tagsService.savedFields[_tagId])

        _presetsIds = _tagConfig.presets ?? []

        if (_presetsIds && _presetsIds.length > 0) {
            for (let i = 0; i < _presetsIds.length; i++) {
                const preset = this.tagsService.presets()[_presetsIds[i]]
                if (!preset) continue
                const presetKeys = preset.keys?.length
                    ? preset.keys
                    : preset.key
                      ? [preset.key]
                      : []

                const tagOfPreset = _tags.find((tag) =>
                    presetKeys.includes(tag.key)
                )

                if (tagOfPreset) {
                    tagOfPreset.preset = preset
                } else {
                    _tags.push({
                        key: preset.key || '',
                        value: '',
                        preset: preset,
                    })
                }
            }
        }

        this.tagIdState.set(_tagId)
        this.featureState.set(feature)
        this.presetsIds = _presetsIds
        this.tagConfigState.set(_tagConfig)
        this.primaryKey = _primaryKey
        this.tagsState.set(_tags)
        return { tagConfig: _tagConfig, tags: _tags, feature: feature }
    }

    dataIsChanged(): boolean {
        const tagsNotNull: Tag[] = []
        for (let i = 0; i < this.tags.length; i++) {
            if (this.tags[i].value) {
                tagsNotNull.push({
                    key: this.tags[i].key,
                    value: this.tags[i].value,
                })
            }
        }

        const originalTagsNotNull: Tag[] = []
        for (let i = 0; i < this.originalTags.length; i++) {
            if (
                this.originalTags[i].value &&
                this.originalTags[i].value !== ''
            ) {
                originalTagsNotNull.push({
                    key: this.originalTags[i].key,
                    value: this.originalTags[i].value,
                })
            }
        }

        return !isEqual(tagsNotNull, originalTagsNotNull)
    }

    changedFieldCount(): number {
        const original = new Map(
            this.originalTags
                .filter((tag) => String(tag.value ?? '').trim() !== '')
                .map((tag) => [tag.key, String(tag.value)])
        )
        const current = new Map(
            this.tags
                .filter((tag) => String(tag.value ?? '').trim() !== '')
                .map((tag) => [tag.key, String(tag.value)])
        )
        const keys = new Set([...original.keys(), ...current.keys()])
        let changes = 0
        for (const key of keys) {
            if (original.get(key) !== current.get(key)) {
                changes++
            }
        }
        return changes + (this.newPosition ? 1 : 0)
    }

    updateMode(): void {
        this.dismissed.emit({ type: 'Edit' })
    }

    toogleCode(): void {
        this.displayCodeState.set(!this.displayCode)
    }

    addNewKey(key: string): void {
        if (this.tags.find((tag) => tag.key === key)) {
            return
        }

        const genericPreset = this.tagsService.presets()[key]
        if (!genericPreset) {
            this.tagsState.set([
                ...this.tags,
                { key: key, value: '', isJustAdded: true },
            ])
        } else {
            this.tagsState.set([
                ...this.tags,
                {
                    key: key,
                    value: '',
                    preset: genericPreset,
                    isJustAdded: true,
                },
            ])
        }
    }

    deleteTag(tag: Tag): void {
        const idx = findIndex(this.tags, { key: tag.key })
        if (idx !== -1) {
            this.tagsState.set([
                ...this.tags.slice(0, idx),
                ...this.tags.slice(idx + 1),
            ])
        }
    }

    toLowerCase(text: string): string {
        return text.toLowerCase()
    }

    findElement(array: Tag[], kv: Partial<Tag>): Tag {
        const idx = findIndex(array, kv)
        if (idx !== -1) {
            return array[idx]
        }
        return { key: '', value: '' }
    }

    dismiss(data?: ModalDismissData): void {
        this.dismissed.emit(data)
    }

    createOsmElement(tagConfig: TagConfig): void {
        this.mapService.setIsProcessing(true)

        this.typeFicheState.set('Loading')
        this.tagsService.addTagTolastTagsUsed(tagConfig.id)

        if (this.configService.getAddSurveyDate()) {
            this.addSurveyDate()
        }

        this.pushTagsToFeature()
        this.osmApi
            .createOsmNode(this.feature)
            .pipe(
                finalize(() => {
                    this.mapService.setIsProcessing(false)
                })
            )
            .subscribe({
                next: (feature) => {
                    this.dismiss({
                        redraw: true,
                        geojson: feature,
                        origineData: 'data_changed',
                    })
                },
                error: (error: unknown) => {
                    console.error(error)
                    this.typeFicheState.set('Edit')
                    this.presentToast(this.translate.instant('SHARED.ERROR'))
                },
            })
    }

    updateOsmElement(tagConfig?: TagConfig): void {
        this.mapService.setIsProcessing(true)
        this.typeFicheState.set('Loading')

        if (tagConfig) {
            this.tagsService.addTagTolastTagsUsed(tagConfig.id)
        }
        if (!this.dataIsChanged() && !this.newPosition) {
            this.mapService.setIsProcessing(false)
            this.dismiss()
            return
        }

        if (this.configService.getAddSurveyDate()) {
            this.addSurveyDate()
        }

        this.pushTagsToFeature()

        this.osmApi
            .updateOsmElement(this.feature, this.origineData)
            .pipe(
                finalize(() => {
                    this.mapService.setIsProcessing(false)
                })
            )
            .subscribe({
                next: (feature) => {
                    this.dismiss({
                        redraw: true,
                        geojson: feature,
                        origineData: 'data_changed',
                    })
                },
                error: (error: unknown) => {
                    console.error(error)
                    this.typeFicheState.set('Edit')
                    this.presentToast(this.translate.instant('SHARED.ERROR'))
                },
            })
    }

    deleteOsmElement(): void {
        this.mapService.setIsProcessing(true)
        this.typeFicheState.set('Loading')
        this.osmApi
            .deleteOsmElement(this.feature)
            .pipe(
                finalize(() => {
                    this.mapService.setIsProcessing(false)
                })
            )
            .subscribe({
                next: () => {
                    this.dismiss({ redraw: true, deleted: true })
                },
                error: (error: unknown) => {
                    console.error(error)
                    this.typeFicheState.set('Edit')
                    this.presentToast(this.translate.instant('SHARED.ERROR'))
                },
            })
    }

    pushTagsToFeature(): void {
        const tagObjects: Record<string, string | number> = {}
        for (let i = 0; i < this.tags.length; i++) {
            const key = this.tags[i].key?.trim()
            const value = this.tags[i].value
            if (
                key &&
                key !== 'undefined' &&
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ''
            ) {
                tagObjects[key] = value
            }
        }
        this.feature.properties.tags = tagObjects
    }

    moveOsmElement(): void {
        this.pushTagsToFeature()
        this.dismiss({ type: 'Move', geojson: this.feature, mode: this.mode })
    }

    openPrimaryTagModal(): void {
        this.categoryRequested.emit()
    }

    applyPrimaryTagSelection(newTagConfig: SelectedTagConfig): void {
        const oldKeyTagsToDelete = Object.keys(this.tagConfig.tags)
        let copyTags = cloneDeep(this.tags).filter(
            (tag) => !oldKeyTagsToDelete.includes(tag.key)
        )

        for (const tag of copyTags) {
            if (tag.preset) delete tag.preset
        }

        const newTagsKeys = Object.keys(newTagConfig.tags)
        const newTagsToAdd = Object.entries(newTagConfig.tags).map(
            ([key, value]) => ({ key, value })
        )
        copyTags = copyTags.filter((tag) => !newTagsKeys.includes(tag.key))
        copyTags = [...newTagsToAdd, ...copyTags]

        if (newTagConfig.addTags) {
            copyTags = this.addTags(newTagConfig.addTags, copyTags)
        }

        this.tagsState.set(copyTags)
        this.initComponent(newTagConfig)
    }

    openModalList(data: Tag, preset: Preset): void {
        const dialogRef = this.dialog.open(ModalSelectList, {
            width: 'min(560px, calc(100vw - 24px))',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 24px)',
            panelClass: 'osmgo-dialog',
            autoFocus: 'dialog',
        })
        dialogRef.componentRef?.setInput('data', { ...data, preset })
        dialogRef.afterClosed().subscribe((_data?: ModalSelectListResult) => {
            if (_data) {
                this.tagsState.set(
                    this.tags.map((tag) =>
                        tag.key === _data.key
                            ? { ...tag, value: _data.value }
                            : tag
                    )
                )
                if (_data.tags) {
                    this.tagsState.set(this.addTags(_data.tags, this.tags))
                    this.initComponent(this.tagConfig)
                }
            }
        })
    }

    openModalAddTag(): void {
        const dialogRef = this.dialog.open(ModalAddTag, {
            width: 'min(620px, calc(100vw - 24px))',
            height: 'min(760px, calc(100dvh - 24px))',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 24px)',
            panelClass: 'osmgo-dialog',
            autoFocus: 'dialog',
        })
        dialogRef.componentRef?.setInput(
            'moreFields',
            this.tagConfig.moreFields || []
        )
        dialogRef.componentRef?.setInput('usedList', [
            ...this.tagConfig.presets,
            ...this.tags.map((e) => e.key),
        ])
        dialogRef.afterClosed().subscribe((newTag?: string) => {
            if (!newTag) return

            this.addNewKey(newTag)
        })
    }

    addTags(
        newTags: Record<string, string | number>,
        existingTags: Tag[]
    ): Tag[] {
        let _existingTags = [...existingTags]
        for (const t in newTags) {
            const tagIndex = _existingTags.findIndex((tag) => tag.key === t)
            if (tagIndex !== -1) {
                _existingTags[tagIndex] = { key: t, value: newTags[t] }
            } else {
                _existingTags = [
                    ..._existingTags,
                    { key: t, value: newTags[t] },
                ]
            }
        }
        return _existingTags
    }

    addPresetsTags(newTags: Record<string, string | number>): void {
        if (newTags) {
            this.tagsState.set(this.addTags(newTags, this.tags))
            this.initComponent(this.tagConfig)
        }
    }

    cancelChange(): void {
        const originalFeature = cloneDeep(
            this.feature.properties.originalData ?? undefined
        )
        this.dataService.cancelFeatureChange(this.feature)
        if (originalFeature) {
            this.dismiss({
                redraw: true,
                geojson: this.mapService.getIconStyle(originalFeature),
                origineData: 'data',
            })
        } else {
            this.dismiss({ redraw: true, deleted: true })
        }
    }
    presentToast(message: string): void {
        this.snackBar.open(message, this.translate.instant('SHARED.CLOSE'), {
            duration: 4000,
        })
    }

    confirmAddSurveyDate(): void {
        const data: ConfirmDialogData = {
            title: this.translate.instant(
                'MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_HEADER'
            ),
            message: this.translate.instant(
                'MODAL_SELECTED_ITEM.ADD_SURVEY_DATE_CONFIRM_MESSAGE'
            ),
            cancelLabel: this.translate.instant('SHARED.NO'),
            confirmLabel: this.translate.instant('SHARED.YES'),
        }
        this.dialog
            .open(ConfirmDialogComponent, {
                data,
                maxWidth: 'calc(100vw - 32px)',
                panelClass: 'osmgo-dialog',
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (confirmed) {
                    this.addSurveyDate()
                    this.updateOsmElement()
                }
            })
    }

    generateISODate(date: Date): string {
        const YYYY = date.getFullYear()
        const MM =
            date.getMonth() + 1 < 10
                ? '0' + (date.getMonth() + 1)
                : '' + (date.getMonth() + 1)
        const DD =
            date.getDate() < 10 ? '0' + date.getDate() : '' + date.getDate()
        return YYYY + '-' + MM + '-' + DD
    }

    shouldShowSurveyCard(): boolean {
        const display = this.configService.getDisplaySurveyCard()
        const today = new Date()
        if (display === 'never') return false
        if (this.feature.properties.meta.timestamp === '0') return false
        if (!this.lastSurvey) return true
        if (
            this.generateISODate(this.lastSurvey) ===
            this.generateISODate(today)
        )
            return false
        if (display === 'always') return true

        const OneYear = 31536000000
        const maxYearAgo = this.configService.getSurveyCardYear()

        return (
            this.lastSurvey.getTime() < today.getTime() - OneYear * maxYearAgo
        )
    }

    handleSurveyYes(): void {
        this.addSurveyDate()
        this.updateOsmElement()
    }

    async handleSurveyNo(): Promise<void> {
        // TODO: Ask whether the feature is closed, disused or no longer exists.
        if (this.feature.properties.type === 'node') {
            await this.presentConfirm()
        }
    }

    addSurveyDate(): void {
        const isoDate = this.generateISODate(new Date())
        const tags = [...this.tags]

        let tagSurveyIndex = -1
        for (let i = 0; i < tags.length; i++) {
            if (tags[i].key === this.configService.config().checkedKey) {
                tagSurveyIndex = i
                break
            }
        }
        if (tagSurveyIndex !== -1) {
            tags[tagSurveyIndex] = {
                ...tags[tagSurveyIndex],
                value: isoDate,
            }
        } else {
            tags.push({
                key: this.configService.config().checkedKey,
                value: isoDate,
            })
        }

        const possibleCheckedKeys = ['survey:date', 'check_date']
        for (let i = 0; i < tags.length; i++) {
            const key = tags[i].key
            if (
                key !== this.configService.config().checkedKey &&
                possibleCheckedKeys.includes(key)
            ) {
                tags.splice(i, 1)
                i--
            }
        }
        this.tagsState.set(tags)
    }

    saveFields(tagId: string, tags: Tag[]): void {
        const savedTags = tags
            .map((t) => {
                return { key: t.key, value: t.value }
            })
            .filter((t) => t.key !== 'name')
            .filter((t) => t.key !== 'survey:date')
            .filter((t) => t.key !== 'check_date')
        this.tagsService.addSavedField(tagId, savedTags)
        this.savedFieldsState.set({
            ...this.savedFields,
            tags: [...savedTags],
        })
    }

    restoreFields(tagId: string, tags: Tag[]): void {
        const fields = this.tagsService.savedFields[tagId]
        const newTags = tags.map((tag) => ({ ...tag }))
        if (fields) {
            for (const stags of fields.tags) {
                const t = newTags.find((o) => o.key === stags.key)
                if (t) {
                    t.value = stags.value
                } else {
                    newTags.push(stags)
                }
            }
        }
        this.tagsState.set([...newTags])
        this.initComponent(this.tagConfig)
    }

    fixDeprecated(deprecated: DeprecatedTags): void {
        const deprecatedKeys = Object.keys(deprecated.old)
        const featureTags = { ...this.feature.properties.tags }
        for (const deprecatedKey of deprecatedKeys) {
            delete featureTags[deprecatedKey]
        }
        this.feature.properties.tags = {
            ...featureTags,
            ...deprecated.replace,
        }
        const replacementTags = Object.entries(deprecated.replace).map(
            ([key, value]) => ({ key, value })
        )
        const remainingTags = this.tags.filter(
            (tag) => !deprecatedKeys.includes(tag.key)
        )
        this.tagsState.set([...replacementTags, ...remainingTags])

        if (this.mode !== 'Update') {
            this.modeState.set('Update')
            this.typeFicheState.set('Edit')
        }

        this.initComponent()
    }

    addOrRemoveBookmark(tag: TagConfig): void {
        if (!this.tagsService.bookmarksIds().includes(tag.id)) {
            this.tagsService.addBookMark(tag)
        } else {
            this.tagsService.removeBookMark(tag)
        }
    }
}
