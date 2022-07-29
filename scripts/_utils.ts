import fs from 'fs'
import { TapPresetsJson, TapTagsJson } from '@osmgo/type'
import { tapPresetsPath, tapTagsPath } from './_paths'

/** Reads the tags from the tags and presets (tap) JSON definition. */
export const readTapTagsFromJson = (): TapTagsJson => {
    return JSON.parse(fs.readFileSync(tapTagsPath, 'utf8'))
}

/** Reads the presets from the tags and presets (tap) JSON definition. */
export const readTapPresetsFromJson = (): TapPresetsJson => {
    return JSON.parse(fs.readFileSync(tapPresetsPath, 'utf8'))
}
