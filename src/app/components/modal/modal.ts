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
import { cloneDeep } from '@app/utils/clone'
import { isNodeUsedByWay } from '@app/utils/osm-feature'
import {
    normalizedOsmTagMap,
    normalizeEditorTags,
    normalizeOsmTagKey,
    normalizeOsmTags,
    osmTagMapsEqual,
} from '@app/utils/osm-tags'
import { AlertComponent } from '@components/modal/components/alert/alert.component'
import { EditOtherTag } from '@components/modal/components/edit/OtherTag.component'
import { EditPresets } from '@components/modal/components/edit/Presets.component'
import { PrimaryKey } from '@components/modal/components/primary-key/PrimaryKey'
import type { TagSelectionChange } from '@components/modal/components/select/select.component'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import type {
    FeatureIdSource,
    MapMode,
    OsmGoFeature,
    Preset,
    PrimaryTag,
    Tag,
    TagConfig,
} from '@osmgo/type'
import { osmTagKeyToPresetId } from '@osmgo/utils'
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
import { finalize, take } from 'rxjs/operators'
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

type EditorMode = Extract<MapMode, 'Create' | 'Update'>
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
        OrderByPresetPipe,
        PrimaryKey,
        TranslateModule,
    ],
})
export class ObjectEditorContentComponent {
    readonly isNodeUsedByWay = isNodeUsedByWay
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
    private readonly typeFicheState = signal<'Loading' | 'Edit'>('Loading')
    get typeFiche(): 'Loading' | 'Edit' {
        return this.typeFicheState()
    }

    private readonly displayCodeState = signal(false)
    get displayCode(): boolean {
        return this.displayCodeState()
    }

    private readonly modeState = signal<EditorMode>('Update')
    get mode(): EditorMode {
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

    get hasSavedFields(): boolean {
        return Boolean(this.savedFields?.tags.length)
    }

    get fieldMemoryCategory(): string {
        const language = this.configService.config().languageTags
        return (
            this.tagConfig.lbl?.[language] ||
            this.tagConfig.lbl?.['en'] ||
            String(this.primaryKey.value)
        )
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

    readonly dataInput = input.required<OsmGoFeature>({ alias: 'data' })
    readonly modeInput = input.required<EditorMode>({ alias: 'type' })
    readonly newPositionInput = input(false, {
        alias: 'newPosition',
    })
    readonly origineDataInput = input<FeatureIdSource>('data', {
        alias: 'origineData',
    })
    readonly openPrimaryTagModalOnStartInput = input(false, {
        alias: 'openPrimaryTagModalOnStart',
    })
    readonly dismissed = output<ModalDismissData | undefined>()
    readonly categoryRequested = output<void>()
    private initializedData?: OsmGoFeature
    private initializedMode?: EditorMode
    private initializedNewPosition?: boolean
    private initializedOrigin?: FeatureIdSource
    private initializedOpenCategory?: boolean

    constructor() {
        effect(() => {
            const data = this.dataInput()
            const mode = this.modeInput()
            const newPosition = this.newPositionInput()
            const origin = this.origineDataInput()
            const openCategory = this.openPrimaryTagModalOnStartInput()

            untracked(() => {
                this.synchronizeInputs({
                    data,
                    mode,
                    newPosition,
                    origin,
                    openCategory,
                })
            })
        })
    }

    private synchronizeInputs(inputs: {
        data: OsmGoFeature
        mode: EditorMode
        newPosition: boolean
        origin: FeatureIdSource
        openCategory: boolean
    }): void {
        const unchanged =
            this.initializedData === inputs.data &&
            this.initializedMode === inputs.mode &&
            this.initializedNewPosition === inputs.newPosition &&
            this.initializedOrigin === inputs.origin &&
            this.initializedOpenCategory === inputs.openCategory
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
        this.initializeFromInputs(inputs)
        this.initComponent()
        if (this.mode === 'Create' && this.openPrimaryTagModalOnStart) {
            this.openPrimaryTagModal()
        }
    }

    private initializeFromInputs(inputs: {
        data: OsmGoFeature
        mode: EditorMode
        newPosition: boolean
        origin: FeatureIdSource
        openCategory: boolean
    }): void {
        this.displayCodeState.set(false)
        this.newPosition = inputs.newPosition
        this.featureState.set(cloneDeep(inputs.data))

        const originalFeatureGeometry: Geometry = this.feature.properties
            .way_geometry
            ? this.feature.properties.way_geometry
            : this.feature.geometry

        const typeGeomFeature = originalFeatureGeometry.type
        const usedByWay = isNodeUsedByWay(this.feature)
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
        this.feature.properties.tags = normalizeOsmTags(
            this.feature.properties.tags
        )

        const tags: Tag[] = []

        for (const tag in this.feature.properties.tags) {
            const preset = this.tagsService.presets()[osmTagKeyToPresetId(tag)]
            const data: Tag = {
                key: tag,
                value: this.feature.properties.tags[tag],
            }
            if (preset) data.preset = preset
            tags.push(data)
        }

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
        let _tags = normalizeEditorTags(this.tags)
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
        this.typeFicheState.set('Edit')

        _tags = _tags.filter((tag) => tag.value !== '' && !tag.isDefaultValue)
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
        if (
            _presetsIds.some((presetId) => presetId.endsWith('#brand')) &&
            !this.tagsService.brandPresetsLoaded()
        ) {
            this.tagsService
                .loadBrandPresets$()
                .pipe(take(1))
                .subscribe({
                    next: () => this.initComponent(_tagConfig),
                    error: (error) =>
                        console.warn('Unable to load brand presets.', error),
                })
        }
        return { tagConfig: _tagConfig, tags: _tags, feature: feature }
    }

    dataIsChanged(): boolean {
        return !osmTagMapsEqual(
            normalizedOsmTagMap(this.tags),
            normalizedOsmTagMap(this.originalTags)
        )
    }

    changedFieldCount(): number {
        const original = normalizedOsmTagMap(this.originalTags)
        const current = normalizedOsmTagMap(this.tags)
        const keys = new Set([...original.keys(), ...current.keys()])
        let changes = 0
        for (const key of keys) {
            if (original.get(key) !== current.get(key)) {
                changes++
            }
        }
        return changes + (this.newPosition ? 1 : 0)
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
        const idx = this.tags.findIndex(
            (candidate) => candidate.key === tag.key
        )
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
        const entries = Object.entries(kv) as Array<[keyof Tag, Tag[keyof Tag]]>
        const idx = array.findIndex((candidate) =>
            entries.every(([key, value]) => candidate[key] === value)
        )
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
                    this.rememberFields(tagConfig, this.tags)
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
        this.feature.properties.tags = Object.fromEntries(
            normalizedOsmTagMap(this.tags)
        )
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
        let nextTags = existingTags.map((tag) => ({ ...tag }))
        for (const [rawKey, rawValue] of Object.entries(newTags)) {
            const key = normalizeOsmTagKey(rawKey)
            const value = String(rawValue).trim()
            if (!key || value === '') continue
            const tagIndex = nextTags.findIndex((tag) => tag.key === key)
            if (tagIndex !== -1) {
                nextTags[tagIndex] = {
                    ...nextTags[tagIndex],
                    key,
                    value,
                }
            } else {
                nextTags = [...nextTags, { key, value }]
            }
        }
        return nextTags
    }

    applyTagSelection(change: TagSelectionChange): void {
        const sourceIndex = this.tags.indexOf(change.source)
        if (sourceIndex < 0) return
        const selected = normalizeEditorTags([change.tag])[0]
        const nextTags = this.tags.map((tag) => ({ ...tag }))
        const collisionIndex = selected.key
            ? nextTags.findIndex(
                  (tag, index) =>
                      index !== sourceIndex && tag.key === selected.key
              )
            : -1
        if (collisionIndex < 0) {
            nextTags[sourceIndex] = selected
        } else {
            const merged = {
                ...nextTags[collisionIndex],
                ...selected,
            }
            const insertAt = Math.min(sourceIndex, collisionIndex)
            const withoutDuplicates = nextTags.filter(
                (_tag, index) =>
                    index !== sourceIndex && index !== collisionIndex
            )
            withoutDuplicates.splice(insertAt, 0, merged)
            this.tagsState.set(withoutDuplicates)
            return
        }
        this.tagsState.set(nextTags)
    }

    addPresetsTags(newTags: Record<string, string | number>): void {
        if (newTags) {
            this.tagsState.set(this.addTags(newTags, this.tags))
            this.initComponent(this.tagConfig)
        }
    }

    async cancelChange(): Promise<void> {
        const originalFeature = cloneDeep(
            this.feature.properties.originalData ?? undefined
        )
        try {
            await this.dataService.cancelPendingChange(String(this.feature.id))
        } catch (error) {
            this.presentToast(
                error instanceof Error ? error.message : String(error)
            )
            return
        }
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

    rememberFields(tagConfig: TagConfig, tags: Tag[]): void {
        const savedTags = this.reusableFields(tagConfig, tags)
        this.tagsService.addSavedField(tagConfig.id, savedTags)
        this.savedFieldsState.set({
            tags: [...savedTags],
        })
    }

    restoreFields(tagId: string, tags: Tag[]): void {
        const fields = this.tagsService.savedFields[tagId]
        const newTags = tags.map((tag) => ({ ...tag }))
        if (fields) {
            for (const stags of this.reusableFields(
                this.tagConfig,
                fields.tags
            )) {
                const t = newTags.find((o) => o.key === stags.key)
                if (t) {
                    t.value = stags.value
                } else {
                    newTags.push(cloneDeep(stags))
                }
            }
        }
        this.tagsState.set([...newTags])
        this.initComponent(this.tagConfig)
    }

    private reusableFields(tagConfig: TagConfig, tags: Tag[]): Tag[] {
        const excludedKeys = new Set([
            ...Object.keys(tagConfig.tags),
            'name',
            'survey:date',
            'check_date',
        ])
        return tags
            .filter(
                (tag) =>
                    Boolean(tag.key) &&
                    !excludedKeys.has(tag.key) &&
                    String(tag.value).trim() !== '' &&
                    !tag.isDefaultValue
            )
            .map((tag) => ({ key: tag.key, value: tag.value }))
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
