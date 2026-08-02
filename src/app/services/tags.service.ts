import { HttpClient } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { Storage } from '@ionic/storage-angular'
import {
    JsonSprites,
    OsmGoFeature,
    Preset,
    PrimaryTag,
    Tag,
    TagConfig,
    TagsJson,
} from '@osmgo/type'
import { forkJoin, from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface SavedField {
    tags: Tag[]
}

@Injectable({ providedIn: 'root' })
export class TagsService {
    private readonly http = inject(HttpClient)
    readonly localStorage = inject(Storage)

    private readonly lastTagsUsedIdsState = signal<string[]>([])
    readonly lastTagsUsedIds = this.lastTagsUsedIdsState.asReadonly()
    private readonly bookmarksIdsState = signal<string[]>([])
    readonly bookmarksIds = this.bookmarksIdsState.asReadonly()
    private readonly hiddenTagsIdsState = signal<string[]>([])
    readonly hiddenTagsIds = this.hiddenTagsIdsState.asReadonly()

    savedFields: Record<string, SavedField> = {}
    private readonly tagsState = signal<TagConfig[]>([])
    readonly tags = this.tagsState.asReadonly()
    userTags: TagConfig[] = []
    private readonly primaryKeysState = signal<string[]>([])
    readonly primaryKeys = this.primaryKeysState.asReadonly()
    private readonly presetsState = signal<Record<string, Preset>>({})
    readonly presets = this.presetsState.asReadonly()
    private readonly jsonSpritesState = signal<JsonSprites>({})
    readonly jsonSprites = this.jsonSpritesState.asReadonly()

    defaultHiddenTagsIds: string[] = [
        'highway/pedestrian_area',
        'highway/footway',
        'highway/motorway',
        'highway/trunk',
        'highway/trunk_link',
        'highway/primary',
        'highway/primary_link',
        'highway/secondary',
        'highway/secondary_link',
        'highway/tertiary',
        'highway/tertiary_link',
        'highway/unclassified',
        'highway/residential',
        'highway/service',
        'highway/service/alley',
        'highway/motorway_link',
        'highway/living_street',
        'highway/track',
        'highway/bus_guideway',
        'highway/road',
        'highway/bridleway',
        'highway/path',
        'highway/cycleway',
        'highway/construction',
        'highway/steps',
        'highway/motorway_junction',
        'highway/corridor',
        'highway/pedestrian_line',
        'highway/cycleway/bicycle_foot',
        'highway/footway/crossing',
        'highway/service/parking_aisle',
        'highway/service/driveway',
        'highway/path/informal',
        'highway/stop',
        'highway/turning_circle',

        'railway/platform',
        'railway/abandoned',
        'railway/construction',
        'railway/disused',
        'railway/funicular',
        'railway/light_rail',
        'railway/miniature',
        'railway/monorail',
        'railway/narrow_gauge',
        'railway/rail',
        'railway/rail/highspeed',
        'railway/subway',
        'railway/tram',
        'railway/tram_level_crossing',
        'railway/tram_crossing',
        'railway/railway_crossing',

        'barrier/kerb',
        'barrier/kerb/flush',
        'barrier/kerb/lowered',
        'barrier/kerb/raised',
        'barrier/kerb/rolled',

        'natural/grassland',
        'natural/wood',
        'natural/bare_rock',
        'natural/cliff',
        'natural/shingle',
        'natural/coastline',

        'waterway/riverbank',
        'waterway/canal',
        'waterway/canal/lock',
        'waterway/ditch',
        'waterway/drain',
        'waterway/fish_pass',
        'waterway/river',
        'waterway/stream_intermittent',
        'waterway/stream',
        'waterway/tidal_channel',

        'man_made/bridge',

        'building/yes',
        'building/train_station',
        'building/apartments',
        'building/barn',
        'building/boathouse',
        'building/bungalow',
        'building/cabin',
        'building/carport',
        'building/cathedral',
        'building/chapel',
        'building/church',
        'building/civic',
        'building/college',
        'building/commercial',
        'building/construction',
        'building/detached',
        'building/dormitory',
        'building/farm_auxiliary',
        'building/farm',
        'building/garage',
        'building/garages',
        'building/grandstand',
        'building/greenhouse',
        'building/hangar',
        'building/hospital',
        'building/hotel',
        'building/house',
        'building/houseboat',
        'building/hut',
        'building/industrial',
        'building/kindergarten',
        'building/mosque',
        'building/pavilion',
        'building/public',
        'building/residential',
        'building/retail',
        'building/roof',
        'building/ruins',
        'building/school',
        'building/semidetached_house',
        'building/service',
        'building/shed',
        'building/stable',
        'building/stadium',
        'building/static_caravan',
        'building/temple',
        'building/terrace',
        'building/transportation',
        'building/university',
        'building/warehouse',
        'building/office',
    ]

    getTagConfigFromTagsID(tagIds: string[]): TagConfig[] {
        return this.tags().filter((tag) => tagIds.includes(tag.id))
    }

    setBookMarksIds(bookmarksIds: string[]): void {
        this.localStorage.set('bookmarksIds', bookmarksIds)
        this.bookmarksIdsState.set(bookmarksIds)
    }

    setLastTagsUsedIds(lastTagsUsedIds: string[]): void {
        this.localStorage.set('lastTagsUsedIds', lastTagsUsedIds)
        this.lastTagsUsedIdsState.set(lastTagsUsedIds)
    }

    removeBookMark(tag: TagConfig): void {
        this.setBookMarksIds(
            this.bookmarksIds().filter((bookmarkId) => bookmarkId !== tag.id)
        )
    }

    addBookMark(tag: TagConfig): void {
        if (this.bookmarksIds().includes(tag.id)) {
            return
        }
        const currentTag = this.tags().find((t) => t.id === tag.id)
        if (!currentTag) {
            this.addUserTags(tag)
        }
        this.setBookMarksIds([tag.id, ...this.bookmarksIds()])
    }

    loadBookMarksIds$(): Observable<string[]> {
        return from(this.localStorage.get('bookmarksIds')).pipe(
            map((bookmarksIds: string[]) => {
                bookmarksIds = bookmarksIds ? bookmarksIds : []
                this.bookmarksIdsState.set(bookmarksIds)
                return bookmarksIds
            })
        )
    }

    // hidden tags
    loadHiddenTagsIds$(): Observable<string[]> {
        return from(this.localStorage.get('hiddenTagsIds')).pipe(
            map((hiddenTagsIds: string[]) => {
                hiddenTagsIds = hiddenTagsIds
                    ? hiddenTagsIds
                    : [...this.defaultHiddenTagsIds]
                this.hiddenTagsIdsState.set(hiddenTagsIds)
                return hiddenTagsIds
            })
        )
    }

    setHiddenTagsIds(hiddenTagsIds: string[]): void {
        this.localStorage.set('hiddenTagsIds', hiddenTagsIds)
        this.hiddenTagsIdsState.set(hiddenTagsIds)
    }

    removeHiddenTag(tag: TagConfig): void {
        if (!tag.id) {
            return
        }
        const newHiddenTags = this.hiddenTagsIds().filter((t) => t !== tag.id)
        this.setHiddenTagsIds(newHiddenTags)
    }

    addHiddenTag(tag: TagConfig): void {
        if (!tag.id) {
            return
        }
        if (!this.hiddenTagsIds().includes(tag.id)) {
            const newHiddenTags = [tag.id, ...this.hiddenTagsIds()]
            this.setHiddenTagsIds(newHiddenTags)
            this.removeBookMark(tag)
        }
    }

    resetHiddenTags(): void {
        const defaultHiddenTagsIds = [...this.defaultHiddenTagsIds]
        this.setHiddenTagsIds(defaultHiddenTagsIds)
    }

    removeAllHiddenTags(): void {
        this.setHiddenTagsIds([])
    }

    loadLastTagsUsedIds$(): Observable<string[]> {
        return from(this.localStorage.get('lastTagsUsedIds')).pipe(
            map((lastTagsUsedIds: string[]) => {
                lastTagsUsedIds = lastTagsUsedIds ? lastTagsUsedIds : []
                this.lastTagsUsedIdsState.set(lastTagsUsedIds)
                return lastTagsUsedIds
            })
        )
    }

    addTagTolastTagsUsed(tagId: string): TagConfig | undefined {
        if (!tagId) {
            return
        }
        const previousTagIds = this.lastTagsUsedIds().filter(
            (previousTagId) => previousTagId !== tagId
        )
        const currentTag = this.tags().find((t) => t.id === tagId)
        if (!currentTag) {
            return
        }

        this.setLastTagsUsedIds([tagId, ...previousTagIds].slice(0, 20))
        return currentTag
    }

    loadUserTags$(): Observable<TagConfig[]> {
        return from(this.localStorage.get('userTags')).pipe(
            map((userTags: TagConfig[]) => {
                userTags = userTags ? userTags : []
                this.userTags = userTags
                return userTags
            })
        )
    }

    setUserTags(userTags: TagConfig[]): void {
        this.localStorage.set('userTags', userTags)
        this.userTags = userTags
    }

    addUserTags(newTag: TagConfig): void {
        const newTagId = newTag.id
        if (this.userTags.find((t) => t.id === newTagId)) {
            return
        }
        newTag.geometry = ['point', 'vertex', 'line', 'area']
        newTag.icon = 'maki-circle-custom'
        newTag.markerColor = '#000000'
        this.userTags = [...this.userTags, newTag]
        this.tagsState.update((tags) => [...tags, newTag])
        this.setUserTags(this.userTags)
    }

    loadSavedFields$(): Observable<Record<string, SavedField>> {
        return from(this.localStorage.get('savedFields')).pipe(
            map((d: Record<string, SavedField> | null | undefined) => {
                const res = d ? d : {}
                this.savedFields = res
                return res
            })
        )
    }

    addSavedField(tagId: string, tags: Tag[]): void {
        this.savedFields[tagId] = { tags }
        this.localStorage.set('savedFields', this.savedFields)
    }

    findPkey(featureOrTags: OsmGoFeature | Tag[]): PrimaryTag | undefined {
        const pkeys = this.primaryKeys()
        if (
            !Array.isArray(featureOrTags) &&
            featureOrTags.properties &&
            featureOrTags.properties.tags
        ) {
            for (const k in featureOrTags.properties.tags) {
                if (pkeys.includes(k)) {
                    return { key: k, value: featureOrTags.properties.tags[k] }
                }
            }
        } else if (Array.isArray(featureOrTags)) {
            for (const t of featureOrTags) {
                if (pkeys.includes(t.key)) {
                    return { key: t.key, value: t.value }
                }
            }
        }
        return undefined
    }

    getTagsConfig$(): Observable<TagsJson> {
        return this.http.get<TagsJson>(`assets/tagsAndPresets/tags.json`).pipe(
            map((tagsConfig) => {
                this.primaryKeysState.set(tagsConfig.primaryKeys)
                return tagsConfig
            })
        )
    }

    loadPresets$(): Observable<Record<string, Preset>> {
        return this.http
            .get<Record<string, Preset>>(`assets/tagsAndPresets/presets.json`)
            .pipe(
                map((p) => {
                    const json = p
                    for (const k in json) {
                        json[k]._id = k
                    }
                    this.presetsState.set(json)
                    return json
                })
            )
    }

    loadJsonSprites$(): Observable<JsonSprites> {
        const devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1
        const url =
            devicePixelRatio === 1
                ? `assets/mapStyle/sprites/sprites.json`
                : `assets/mapStyle/sprites/sprites@2x.json`
        return this.http.get<JsonSprites>(url).pipe(
            map((jsonSprites) => {
                this.jsonSpritesState.set(jsonSprites)
                return jsonSprites
            })
        )
    }

    loadTags$(): Observable<TagConfig[]> {
        return forkJoin(this.getTagsConfig$(), this.loadUserTags$()).pipe(
            map(([tagsConfig, userTags]: [TagsJson, TagConfig[]]) => {
                const tags: TagConfig[] = [...tagsConfig.tags, ...userTags]
                this.tagsState.set(tags)
                return tags
            })
        )
    }
}
