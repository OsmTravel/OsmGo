import { computed, inject, Service, signal } from '@angular/core'
import type { OsmGoChangeType, OsmGoFeature } from '@osmgo/type'
import { addAttributesToFeature } from '@scripts/osmToOsmgo/index.js'
import { ConfigService, type User } from '@services/config.service'
import { DataService, type UploadReceiptEntry } from '@services/data.service'
import { MapService } from '@services/map.service'
import { OsmApiService, type OsmDiffResult } from '@services/osmApi.service'
import { cloneDeep } from 'lodash'
import { firstValueFrom, type Observable } from 'rxjs'
import { take } from 'rxjs/operators'

export interface UploadSummary {
    Total: number
    Create: number
    Update: number
    Delete: number
}

export type UploadFeature = OsmGoFeature & { error?: string }

export type UploadFailureStage =
    | 'validation'
    | 'connection'
    | 'changeset'
    | 'upload'
    | 'reconciliation'

export type UploadRecoveryAction =
    | 'editQueue'
    | 'reconnect'
    | 'reauthenticate'
    | 'createChangeset'
    | 'inspectServer'
    | 'resumeReconciliation'
    | 'retry'

export interface UploadFailure {
    status: number
    message: string
    feature: UploadFeature | null
    queuePreserved: true
    canClose: true
    canRetry: boolean
    recoveryAction: UploadRecoveryAction
}

export type UploadState =
    | { kind: 'idle' }
    | { kind: 'validating' }
    | { kind: 'creatingChangeset' }
    | { kind: 'uploading'; attemptId: string }
    | { kind: 'receiptReceived'; attemptId: string }
    | { kind: 'reconciling'; attemptId: string }
    | { kind: 'succeeded'; summary: UploadSummary }
    | {
          kind: 'failed'
          stage: UploadFailureStage
          error: UploadFailure
      }

interface OsmRequestError {
    status?: unknown
    error?: unknown
    message?: unknown
}

interface SubmittedUpload {
    feature: UploadFeature
    operation: OsmGoChangeType
}

export interface UploadCoordinatorDependencies {
    getPendingFeatures(): UploadFeature[]
    getUserDetail$(): Observable<unknown>
    getValidChangeset(comment: string): Observable<string>
    serializeDiff(features: UploadFeature[], changesetId: string): string
    uploadDiff(diff: string, changesetId: string): Observable<unknown>
    applyReceipt(receipt: UploadReceiptEntry[]): Promise<void>
    getUserInfo(): User
    setChangesetComment(comment: string): void
    updateChangesetLastActivity(): void
    invalidateChangeset(): void
    styleFeature(feature: OsmGoFeature): OsmGoFeature
    setProcessing(processing: boolean): void
    redraw(): void
    createAttemptId(): string
    now(): Date
    onTransition?(state: UploadState): void
}

const createAttemptId = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`

const emptySummary = (): UploadSummary => ({
    Total: 0,
    Create: 0,
    Update: 0,
    Delete: 0,
})

export class UploadCoordinator {
    private readonly stateSignal = signal<UploadState>({ kind: 'idle' })
    readonly state = this.stateSignal.asReadonly()
    readonly inFlight = computed(() =>
        [
            'validating',
            'creatingChangeset',
            'uploading',
            'receiptReceived',
            'reconciling',
        ].includes(this.stateSignal().kind)
    )
    private activeAttempt?: Promise<UploadState>

    constructor(private readonly dependencies: UploadCoordinatorDependencies) {}

    start(comment: string): Promise<UploadState> {
        if (this.activeAttempt) return this.activeAttempt
        const current = this.stateSignal()
        if (current.kind === 'failed' && !current.error.canRetry) {
            return Promise.resolve(current)
        }

        const attempt = this.run(comment)
        this.activeAttempt = attempt.finally(() => {
            this.activeAttempt = undefined
        })
        return this.activeAttempt
    }

    resetTerminalState(): void {
        const current = this.stateSignal().kind
        if (current === 'succeeded' || current === 'failed') {
            this.transition({ kind: 'idle' })
        }
    }

    private async run(comment: string): Promise<UploadState> {
        let stage: UploadFailureStage = 'validation'
        let changesetId = ''
        this.transition({ kind: 'validating' })
        this.dependencies.setProcessing(true)

        try {
            const features = cloneDeep(this.dependencies.getPendingFeatures())
            const submissions = this.validateQueue(features)
            const summary = this.getSummary(features)
            this.dependencies.setChangesetComment(comment)

            stage = 'connection'
            await firstValueFrom(
                this.dependencies.getUserDetail$().pipe(take(1))
            )

            stage = 'changeset'
            this.transition({ kind: 'creatingChangeset' })
            changesetId = await firstValueFrom(
                this.dependencies.getValidChangeset(comment).pipe(take(1))
            )
            const diff = this.dependencies.serializeDiff(features, changesetId)
            const attemptId = this.dependencies.createAttemptId()

            stage = 'upload'
            this.transition({ kind: 'uploading', attemptId })
            const rawReceipt = await firstValueFrom(
                this.dependencies.uploadDiff(diff, changesetId).pipe(take(1))
            )
            this.transition({ kind: 'receiptReceived', attemptId })
            this.dependencies.updateChangesetLastActivity()

            stage = 'reconciliation'
            const receipt = this.prepareReceipt(
                rawReceipt,
                submissions,
                changesetId
            )
            this.transition({ kind: 'reconciling', attemptId })
            await this.dependencies.applyReceipt(receipt)
            this.dependencies.redraw()

            const succeeded: UploadState = { kind: 'succeeded', summary }
            this.transition(succeeded)
            return succeeded
        } catch (cause) {
            const failed = this.createFailure(stage, cause, changesetId)
            this.transition(failed)
            return failed
        } finally {
            this.dependencies.setProcessing(false)
        }
    }

    private validateQueue(
        features: UploadFeature[]
    ): Map<string, SubmittedUpload> {
        if (features.length === 0) {
            throw new Error('There are no local changes to upload.')
        }
        const submittedById = new Map<string, SubmittedUpload>()
        for (const feature of features) {
            const type = feature.properties.type
            const id = feature.properties.id
            const osmgoId = `${type}/${id}`
            if (
                !['node', 'way', 'relation'].includes(type) ||
                !Number.isInteger(id) ||
                id === 0 ||
                feature.id !== osmgoId ||
                submittedById.has(osmgoId)
            ) {
                throw new Error('The local OSM upload queue is invalid.')
            }
            submittedById.set(osmgoId, {
                feature,
                operation: this.getSubmittedOperation(feature),
            })
        }
        return submittedById
    }

    private prepareReceipt(
        diffResults: unknown,
        submittedById: Map<string, SubmittedUpload>,
        changesetId: string
    ): UploadReceiptEntry[] {
        if (
            !Array.isArray(diffResults) ||
            diffResults.length !== submittedById.size
        ) {
            throw new Error('OpenStreetMap returned an invalid upload result.')
        }

        const preparedResults: UploadReceiptEntry[] = []
        const processedIds = new Set<string>()
        for (const result of diffResults) {
            if (!result || typeof result !== 'object') {
                throw new Error(
                    'OpenStreetMap returned an invalid upload result.'
                )
            }
            const diff = result as OsmDiffResult
            const oldId = diff.osmgoOldId
            const submission = submittedById.get(oldId)
            if (
                typeof oldId !== 'string' ||
                !submission ||
                processedIds.has(oldId)
            ) {
                throw new Error(
                    'The OSM upload result does not match local data.'
                )
            }
            const validated = this.validateUploadReceipt(diff, submission)
            processedIds.add(oldId)

            const currentFeature = submission.feature
            if (currentFeature.properties.changeType === 'Delete') {
                preparedResults.push({ oldId })
                continue
            }

            if (validated.kind !== 'upsert') {
                throw new Error('OpenStreetMap returned an incomplete result.')
            }
            let newFeature = cloneDeep(currentFeature)
            newFeature.id = validated.newOsmId
            newFeature.properties.id = validated.newId
            newFeature.properties.meta.version = validated.newVersion
            const user = this.dependencies.getUserInfo()
            newFeature.properties.meta.user = user.display_name
            newFeature.properties.meta.uid = user.uid
            newFeature.properties.meta.changeset = changesetId
            const now = this.dependencies.now()
            newFeature.properties.meta.timestamp = now.toISOString()
            newFeature.properties.time = now.getTime()
            if (newFeature.properties.tags.fixme) {
                newFeature.properties.fixme = true
            } else {
                delete newFeature.properties.fixme
            }

            delete newFeature.properties.deprecated
            delete newFeature.properties.changeType
            delete newFeature.properties.originalData
            newFeature = this.dependencies.styleFeature(newFeature)
            addAttributesToFeature(newFeature)

            const hasTags = Object.keys(newFeature.properties.tags).length > 0
            preparedResults.push({
                oldId,
                feature:
                    currentFeature.properties.changeType === 'Create' || hasTags
                        ? newFeature
                        : undefined,
            })
        }

        if (processedIds.size !== submittedById.size) {
            throw new Error('OpenStreetMap returned an incomplete result.')
        }
        return preparedResults
    }

    private getSubmittedOperation(feature: UploadFeature): OsmGoChangeType {
        const changeType = feature.properties.changeType
        if (
            changeType !== 'Create' &&
            changeType !== 'Update' &&
            changeType !== 'Delete'
        ) {
            throw new Error('The local OSM upload queue is invalid.')
        }
        const usedByWays = feature.properties.usedByWays
        if (
            changeType === 'Delete' &&
            (usedByWays === true ||
                (Array.isArray(usedByWays) && usedByWays.length > 0))
        ) {
            return 'Update'
        }
        return changeType
    }

    private validateUploadReceipt(
        diff: OsmDiffResult,
        submission: SubmittedUpload
    ):
        | { kind: 'delete' }
        | {
              kind: 'upsert'
              newId: number
              newVersion: number
              newOsmId: string
          } {
        const feature = submission.feature
        const type = feature.properties.type
        const oldId = String(feature.properties.id)
        if (
            diff.type !== type ||
            diff.old_id !== oldId ||
            diff.osmgoOldId !== `${type}/${oldId}`
        ) {
            throw new Error('The OSM upload result does not match local data.')
        }

        if (submission.operation === 'Delete') {
            if (
                diff.new_id !== undefined ||
                diff.new_version !== undefined ||
                diff.osmgoNewId !== undefined
            ) {
                throw new Error(
                    'The OSM upload result does not match the submitted operation.'
                )
            }
            return { kind: 'delete' }
        }

        const newId = Number(diff.new_id)
        if (
            typeof diff.new_id !== 'string' ||
            !/^[1-9]\d*$/.test(diff.new_id) ||
            !Number.isSafeInteger(newId) ||
            typeof diff.new_version !== 'number' ||
            !Number.isInteger(diff.new_version) ||
            diff.new_version < 1 ||
            diff.osmgoNewId !== `${type}/${diff.new_id}`
        ) {
            throw new Error('OpenStreetMap returned an incomplete result.')
        }

        if (submission.operation === 'Create') {
            if (feature.properties.id >= 0 || diff.new_version !== 1) {
                throw new Error(
                    'The OSM upload result does not match the submitted operation.'
                )
            }
        } else if (
            feature.properties.id < 1 ||
            newId !== feature.properties.id ||
            diff.new_version !== feature.properties.meta.version + 1
        ) {
            throw new Error(
                'The OSM upload result does not match the submitted operation.'
            )
        }

        return {
            kind: 'upsert',
            newId,
            newVersion: diff.new_version,
            newOsmId: diff.osmgoNewId,
        }
    }

    private createFailure(
        stage: UploadFailureStage,
        cause: unknown,
        changesetId: string
    ): Extract<UploadState, { kind: 'failed' }> {
        const details = this.getOsmRequestError(cause)
        const status = typeof details.status === 'number' ? details.status : 0
        let message = this.getOsmErrorMessage(cause)
        let recoveryAction = this.getRecoveryAction(stage, status)
        if (this.isClosedChangesetError(details, changesetId)) {
            this.dependencies.invalidateChangeset()
            message = `${message} Please retry to create a new changeset.`
            recoveryAction = 'createChangeset'
        }
        const feature =
            stage === 'upload'
                ? this.getFeatureFromErrorResult(status, message)
                : null
        const canRetry =
            recoveryAction !== 'inspectServer' &&
            recoveryAction !== 'resumeReconciliation'
        return {
            kind: 'failed',
            stage,
            error: {
                status,
                message,
                feature,
                queuePreserved: true,
                canClose: true,
                canRetry,
                recoveryAction,
            },
        }
    }

    private getRecoveryAction(
        stage: UploadFailureStage,
        status: number
    ): UploadRecoveryAction {
        if (status === 401) return 'reauthenticate'
        if (stage === 'validation') return 'editQueue'
        if (stage === 'connection') return 'reconnect'
        if (stage === 'upload') return 'inspectServer'
        if (stage === 'reconciliation') return 'resumeReconciliation'
        return 'retry'
    }

    private getFeatureFromErrorResult(
        status: number,
        message: string
    ): UploadFeature | null {
        let resultId: string | undefined
        if (status === 409) {
            const result = message.match(/(Node|Way|Relation)\s\d+$/)
            if (result) {
                const [type, id] = result[0].toLowerCase().split(' ')
                resultId = `${type}/${id}`
            }
        } else if (status === 410) {
            const result = message.match(
                /(node|way|relation)\swith\sthe\sid\s\d+/
            )
            if (result) {
                const [type, id] = result[0].split(' with the id ')
                resultId = `${type}/${id}`
            }
        }
        return resultId
            ? (this.dependencies
                  .getPendingFeatures()
                  .find((feature) => feature.id === resultId) ?? null)
            : null
    }

    private getSummary(features: UploadFeature[]): UploadSummary {
        const summary = emptySummary()
        for (const feature of features) {
            const changeType = feature.properties.changeType
            if (
                changeType === 'Create' ||
                changeType === 'Update' ||
                changeType === 'Delete'
            ) {
                summary[changeType]++
            }
            summary.Total++
        }
        return summary
    }

    private getOsmRequestError(error: unknown): OsmRequestError {
        return typeof error === 'object' && error !== null
            ? (error as OsmRequestError)
            : {}
    }

    private getOsmErrorMessage(error: unknown): string {
        const details = this.getOsmRequestError(error)
        if (typeof error === 'string' && error.trim()) return error
        if (typeof details.error === 'string' && details.error.trim()) {
            return details.error
        }
        if (typeof details.message === 'string' && details.message.trim()) {
            return details.message
        }
        if (error instanceof Error && error.message.trim()) return error.message
        return 'OpenStreetMap could not process the request.'
    }

    private isClosedChangesetError(
        details: OsmRequestError,
        changesetId: string
    ): boolean {
        if (details.status !== 409 || typeof details.error !== 'string') {
            return false
        }
        const match = details.error
            .trim()
            .match(/^The changeset (\d+) was closed at .+\.?$/)
        return match?.[1] === changesetId
    }

    private transition(next: UploadState): void {
        const current = this.stateSignal().kind
        const allowed: Record<UploadState['kind'], UploadState['kind'][]> = {
            idle: ['validating'],
            validating: ['creatingChangeset', 'failed'],
            creatingChangeset: ['uploading', 'failed'],
            uploading: ['receiptReceived', 'failed'],
            receiptReceived: ['reconciling', 'failed'],
            reconciling: ['succeeded', 'failed'],
            succeeded: ['idle', 'validating'],
            failed: ['idle', 'validating'],
        }
        if (!allowed[current].includes(next.kind)) {
            throw new Error(
                `Invalid upload transition: ${current} -> ${next.kind}`
            )
        }
        this.stateSignal.set(next)
        this.dependencies.onTransition?.(next)
    }
}

@Service()
export class UploadCoordinatorService {
    private readonly dataService = inject(DataService)
    private readonly osmApi = inject(OsmApiService)
    private readonly configService = inject(ConfigService)
    private readonly mapService = inject(MapService)
    private readonly coordinator = new UploadCoordinator({
        getPendingFeatures: () => this.dataService.getGeojsonChanged().features,
        getUserDetail$: () => this.osmApi.getUserDetail$(true),
        getValidChangeset: (comment) => this.osmApi.getValidChangeset(comment),
        serializeDiff: (features, changesetId) =>
            this.osmApi.osmGoFeaturesToOsmDiffFile(features, changesetId),
        uploadDiff: (diff, changesetId) =>
            this.osmApi.apiOsmSendOsmDiffFile(diff, changesetId),
        applyReceipt: (receipt) => this.dataService.applyUploadReceipt(receipt),
        getUserInfo: () => this.configService.getUserInfo(),
        setChangesetComment: (comment) =>
            this.configService.setChangeSetComment(comment),
        updateChangesetLastActivity: () =>
            this.configService.updateChangesetLastActivity(),
        invalidateChangeset: () => this.configService.invalidateChangeset(),
        styleFeature: (feature) => this.mapService.getIconStyle(feature),
        setProcessing: (processing) =>
            this.mapService.setIsProcessing(processing),
        redraw: () => {
            this.mapService.redrawMarkers(this.dataService.getGeojson())
            this.mapService.redrawChangedMarkers(
                this.dataService.getGeojsonChanged()
            )
        },
        createAttemptId,
        now: () => new Date(),
    })

    readonly state = this.coordinator.state
    readonly inFlight = this.coordinator.inFlight

    start(comment: string): Promise<UploadState> {
        return this.coordinator.start(comment)
    }

    resetTerminalState(): void {
        this.coordinator.resetTerminalState()
    }
}
