import { CdkScrollable } from '@angular/cdk/scrolling'
import {
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { IconComponent } from '@components/icon/icon.component'
import {
    type ModalDismissData,
    ObjectEditorContentComponent,
} from '@components/modal/modal'
import { ModalPrimaryTag } from '@components/modal/modal.primaryTag/modal.primaryTag'
import {
    ConfirmDialogComponent,
    type ConfirmDialogData,
} from '@components/shared/confirm-dialog/confirm-dialog'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import type {
    EventShowModal,
    OsmGoFeature,
    Preset,
    TagConfig,
} from '@osmgo/type'
import { formatLocalizedDate } from '@pipes/localized-date.pipe'
import { RelativeTimePipe } from '@pipes/relative-time.pipe'
import { getConfigTag } from '@scripts/osmToOsmgo/index.js'
import { ConfigService } from '@services/config.service'
import { MapService } from '@services/map.service'
import { TagsService } from '@services/tags.service'

export type ObjectSheetLevel = 'collapsed' | 'medium' | 'expanded'
export type ObjectSheetMode = 'read' | 'edit' | 'create' | 'category' | 'saving'

interface ObjectSummaryRow {
    icon: string
    key: string
    label: string
    value: string
}

const SUMMARY_ICONS: Record<string, string> = {
    artist_name: 'person',
    check_date: 'event_available',
    description: 'sell',
    material: 'layers',
    opening_hours: 'schedule',
    start_date: 'calendar_month',
    website: 'language',
    wheelchair: 'accessible',
}

const SUMMARY_LABELS: Record<string, string> = {
    artist_name: 'MAIN.SELECTION.FIELDS.ARTIST',
    material: 'MAIN.SELECTION.FIELDS.MATERIAL',
    start_date: 'MAIN.SELECTION.FIELDS.START_DATE',
}

const SUMMARY_ORDER = ['material', 'start_date', 'artist_name', 'description']

@Component({
    selector: 'app-object-sheet',
    templateUrl: './object-sheet.html',
    styleUrls: ['./object-sheet.scss'],
    imports: [
        CdkScrollable,
        IconComponent,
        MatButtonModule,
        ModalPrimaryTag,
        ObjectEditorContentComponent,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
        RelativeTimePipe,
        TranslateModule,
    ],
    host: {
        '[class.sheet-collapsed]': "level() === 'collapsed'",
        '[class.sheet-medium]': "level() === 'medium'",
        '[class.sheet-expanded]': "level() === 'expanded'",
        '[class.sheet-protected]': 'isEditing()',
    },
})
export class ObjectSheetComponent {
    readonly configService = inject(ConfigService)
    readonly tagsService = inject(TagsService)
    readonly translate = inject(TranslateService)
    readonly mapService = inject(MapService)
    private readonly dialog = inject(MatDialog)

    readonly selection = input.required<EventShowModal>()
    readonly level = input<ObjectSheetLevel>('medium')
    readonly closeRequested = output<void>()
    readonly detailsRequested = output<void>()
    readonly editRequested = output<void>()
    readonly levelChange = output<ObjectSheetLevel>()
    readonly sessionCompleted = output<ModalDismissData>()

    readonly dragOffset = signal(0)
    readonly categoryOpen = signal(false)
    readonly advancedTagsRequested = signal(false)
    readonly userLocale = this.resolveUserLocale()
    private pointerStartY: number | null = null
    private activePointerId: number | null = null
    private sheetTouchStartY: number | null = null
    private sheetTouchStartedInHeader = false
    private initializedObjectKey = ''

    readonly editor = viewChild<ObjectEditorContentComponent>('editor')
    readonly isEditing = computed(
        () =>
            this.selection().type === 'Update' ||
            this.selection().type === 'Create'
    )
    readonly mode = computed<ObjectSheetMode>(() => {
        if (this.categoryOpen()) return 'category'
        if (this.isEditing() && this.mapService.isProcessing()) return 'saving'
        if (this.selection().type === 'Create') return 'create'
        if (this.selection().type === 'Update') return 'edit'
        return 'read'
    })
    readonly showEmbeddedContent = computed(
        () => this.isEditing() || this.level() === 'expanded'
    )
    readonly categoryTagConfig = computed(() => {
        const currentTagConfig = this.editor()?.currentTagConfig()
        return (
            currentTagConfig ??
            getConfigTag(this.feature(), this.tagsService.tags())
        )
    })
    readonly categoryGeometry = computed(() => {
        const editorGeometry = this.editor()?.geometryType
        if (editorGeometry) return editorGeometry
        const feature = this.feature()
        const geometry = feature.properties.way_geometry ?? feature.geometry
        if (geometry.type === 'Point') {
            return feature.properties.usedByWays ? 'vertex' : 'point'
        }
        if (
            geometry.type === 'LineString' ||
            geometry.type === 'MultiLineString'
        ) {
            return 'line'
        }
        return 'area'
    })

    readonly feature = computed<OsmGoFeature>(() => this.selection().geojson)
    readonly selectedTagConfig = computed(() =>
        getConfigTag(this.feature(), this.tagsService.tags())
    )
    readonly bookmarked = computed(() =>
        this.tagsService.bookmarksIds().includes(this.selectedTagConfig().id)
    )
    readonly title = computed(() => {
        const feature = this.feature()
        const name = feature.properties.tags['name'] || feature.properties._name
        return name
            ? String(name)
            : this.translate.instant('MODAL_SELECTED_ITEM.NO_NAME')
    })
    readonly titleSize = computed(() => {
        const length = Array.from(this.title().trim()).length
        if (length <= 22) return 'large'
        if (length <= 38) return 'medium'
        if (length <= 62) return 'compact'
        return 'minimum'
    })
    readonly category = computed(() => {
        const feature = this.feature()
        const language = this.configService.config().languageTags
        const config = this.tagsService
            .tags()
            .find(
                (candidate) =>
                    candidate.id === feature.properties.configId ||
                    candidate.id ===
                        `${feature.properties.primaryTag.key}/${feature.properties.primaryTag.value}`
            )
        return (
            config?.lbl?.[language] ||
            config?.lbl?.['en'] ||
            String(feature.properties.primaryTag.value)
        )
    })
    readonly rows = computed<ObjectSummaryRow[]>(() => {
        const feature = this.feature()
        const tags = feature.properties.tags
        const primaryKey = feature.properties.primaryTag.key

        return Object.entries(tags)
            .filter(
                ([key, value]) =>
                    key !== 'name' &&
                    key !== primaryKey &&
                    value !== '' &&
                    value !== undefined
            )
            .sort(([leftKey], [rightKey]) => {
                const leftIndex = SUMMARY_ORDER.indexOf(leftKey)
                const rightIndex = SUMMARY_ORDER.indexOf(rightKey)
                return (
                    (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
                    (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
                )
            })
            .map(([key, value]) => {
                const preset = this.tagsService.presets()[key.replace(':', '/')]
                return {
                    key,
                    icon: SUMMARY_ICONS[key] ?? 'sell',
                    label: this.getPresetLabel(key, preset),
                    value: this.getPresetValue(String(value), preset),
                }
            })
            .slice(0, 5)
    })
    readonly metadataTimestamp = computed(() =>
        this.feature().properties.meta.timestamp === '0'
            ? 0
            : this.feature().properties.meta.timestamp
    )
    readonly metadataActionKey = computed(() =>
        this.feature().properties.meta.version > 1
            ? 'MAIN.SELECTION.METADATA.UPDATED'
            : 'MAIN.SELECTION.METADATA.CREATED'
    )
    readonly metadataAuthor = computed(
        () =>
            this.feature().properties.meta.user ||
            this.translate.instant('MODAL_SELECTED_ITEM.META_MYSELF')
    )

    constructor() {
        effect(() => {
            const selection = this.selection()
            const key =
                selection.geojson.id ??
                `${selection.geojson.properties.type}/${selection.geojson.properties.id}`
            if (key === this.initializedObjectKey) return
            this.initializedObjectKey = key
            this.advancedTagsRequested.set(false)
            this.categoryOpen.set(
                selection.type === 'Create' &&
                    Boolean(selection.openPrimaryTagModalOnStart)
            )
        })
    }

    toggleBookmark(): void {
        const tagConfig = this.selectedTagConfig()
        if (this.bookmarked()) {
            this.tagsService.removeBookMark(tagConfig)
        } else {
            this.tagsService.addBookMark(tagConfig)
        }
    }

    showDetails(): void {
        this.advancedTagsRequested.set(false)
        this.detailsRequested.emit()
    }

    showAdvancedTags(): void {
        this.advancedTagsRequested.set(true)
        this.levelChange.emit('expanded')
    }

    cycleLevel(): void {
        if (this.isEditing()) return
        const nextLevel: Record<ObjectSheetLevel, ObjectSheetLevel> = {
            collapsed: 'medium',
            medium: 'expanded',
            expanded: 'collapsed',
        }
        this.levelChange.emit(nextLevel[this.level()])
    }

    onPointerDown(event: PointerEvent): void {
        if (this.isEditing()) return
        this.pointerStartY = event.clientY
        this.activePointerId = event.pointerId
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }

    onPointerMove(event: PointerEvent): void {
        if (
            this.pointerStartY === null ||
            event.pointerId !== this.activePointerId
        ) {
            return
        }
        const delta = event.clientY - this.pointerStartY
        this.dragOffset.set(Math.max(-28, delta))
    }

    onPointerUp(event: PointerEvent): void {
        if (
            this.pointerStartY === null ||
            event.pointerId !== this.activePointerId
        ) {
            return
        }

        const delta = event.clientY - this.pointerStartY
        ;(event.currentTarget as HTMLElement).releasePointerCapture(
            event.pointerId
        )
        this.pointerStartY = null
        this.activePointerId = null
        this.dragOffset.set(0)

        if (delta > 42) {
            this.handleDownwardGesture()
        } else if (delta < -42) {
            this.levelChange.emit(
                this.level() === 'collapsed' ? 'medium' : 'expanded'
            )
        } else {
            this.cycleLevel()
        }
    }

    onPointerCancel(): void {
        this.pointerStartY = null
        this.activePointerId = null
        this.dragOffset.set(0)
    }

    onSheetTouchStart(event: TouchEvent): void {
        if (this.isEditing()) return
        const target = event.target
        if (
            event.touches.length !== 1 ||
            (target instanceof Element && target.closest('.sheet-handle'))
        ) {
            this.sheetTouchStartY = null
            this.sheetTouchStartedInHeader = false
            return
        }

        this.sheetTouchStartY = event.touches[0].clientY
        this.sheetTouchStartedInHeader =
            target instanceof Element &&
            target.closest('.object-header') !== null
    }

    onSheetTouchEnd(event: TouchEvent): void {
        if (
            this.sheetTouchStartY === null ||
            event.changedTouches.length === 0
        ) {
            return
        }

        const delta = event.changedTouches[0].clientY - this.sheetTouchStartY
        const startedInHeader = this.sheetTouchStartedInHeader
        this.sheetTouchStartY = null
        this.sheetTouchStartedInHeader = false
        if (delta > 56) {
            this.handleDownwardGesture()
        } else if (
            delta < -56 &&
            startedInHeader &&
            this.level() !== 'expanded'
        ) {
            this.levelChange.emit('expanded')
        }
    }

    onSheetTouchCancel(): void {
        this.sheetTouchStartY = null
        this.sheetTouchStartedInHeader = false
    }

    private handleDownwardGesture(): void {
        if (this.isEditing()) return
        if (this.level() === 'expanded') {
            this.levelChange.emit('medium')
        } else {
            this.closeRequested.emit()
        }
    }

    requestExit(): void {
        if (!this.isEditing()) {
            this.closeRequested.emit()
            return
        }

        const editor = this.editor()
        const hasDraft =
            this.selection().type === 'Create' ||
            Boolean(this.selection().newPosition) ||
            Boolean(editor?.dataIsChanged())
        if (!hasDraft) {
            this.completeCancellation()
            return
        }

        const data: ConfirmDialogData = {
            title: this.translate.instant('MAIN.SELECTION.DISCARD_TITLE'),
            message: this.translate.instant('MAIN.SELECTION.DISCARD_MESSAGE'),
            cancelLabel: this.translate.instant('SHARED.CANCEL'),
            confirmLabel: this.translate.instant('MAIN.SELECTION.DISCARD'),
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
                if (confirmed) this.completeCancellation()
            })
    }

    handleEditorDismissed(result?: ModalDismissData): void {
        if (!result) {
            this.requestExit()
            return
        }
        if (result.type === 'Edit') {
            this.editRequested.emit()
            return
        }
        this.sessionCompleted.emit(result)
    }

    openCategory(): void {
        this.categoryOpen.set(true)
    }

    handleCategoryCompleted(tagConfig: TagConfig | null): void {
        if (tagConfig) this.editor()?.applyPrimaryTagSelection(tagConfig)
        this.categoryOpen.set(false)
    }

    private completeCancellation(): void {
        this.categoryOpen.set(false)
        if (this.selection().type === 'Create') {
            this.closeRequested.emit()
        } else {
            this.sessionCompleted.emit({ type: 'Cancel' })
        }
    }

    private getPresetLabel(key: string, preset?: Preset): string {
        const translatedLabel = SUMMARY_LABELS[key]
        if (translatedLabel) {
            return this.translate.instant(translatedLabel)
        }
        const language = this.configService.config().languageTags
        return (
            preset?.lbl[language] ||
            preset?.lbl['en'] ||
            key.replaceAll(':', ' · ').replaceAll('_', ' ')
        )
    }

    private getPresetValue(value: string, preset?: Preset): string {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return formatLocalizedDate(value, this.userLocale)
        }
        if (!preset?.options) {
            return value
        }
        const option = preset.options.find((candidate) => candidate.v === value)
        const language = this.configService.config().languageTags
        return option?.lbl?.[language] || option?.lbl?.['en'] || value
    }

    private resolveUserLocale(): string {
        return (
            globalThis.navigator?.languages?.[0] ||
            globalThis.navigator?.language ||
            this.configService.config().languageUi ||
            'en'
        )
    }
}
