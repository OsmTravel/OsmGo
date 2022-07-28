import path from 'path'

/** OsmGo project's root directory. */
export const rootDir = path.join(__dirname, '..')
/** This directory lives outside of the current project. */
export const parentDir = path.join(rootDir, '..')

// Assets & Resources
/** Path to the asset folder of the OsmGo project. */
export const assetsFolder = path.join(rootDir, 'src', 'assets')
export const resourcesFolder = path.join(rootDir, 'resources')
export const iconsSVGsPath = path.join(resourcesFolder, 'IconsSVG')

// i18n
export const i18nFolder = path.join(assetsFolder, 'i18n')

// Android
export const androidFolder = path.join(rootDir, 'android')

// Tags and Presets
export const tagsAndPresetsFolder = path.join(assetsFolder, 'tagsAndPresets')
export const tagsOsmgoPath = path.join(tagsAndPresetsFolder, 'tags.json')
export const presetsOsmgoPath = path.join(tagsAndPresetsFolder, 'presets.json')
export const basemapOsmGoPath = path.join(tagsAndPresetsFolder, 'basemap.json')

// id-tagging-schema project paths
export const idRepoPath = path.join(parentDir, 'id-tagging-schema', 'dist')
export const tagsIDPath = path.join(idRepoPath, 'presets.json')
export const presetsIDPath = path.join(idRepoPath, 'fields.json')
export const idTranslationsPath = path.join(idRepoPath, 'translations')
