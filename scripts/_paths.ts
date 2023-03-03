import path from 'path'

/** OsmGo project's root directory. */
export const rootDir = path.join(__dirname, '..')
/** This directory is the parent directory of the current project. It is located
 * outside of the current project. */
export const parentDir = path.join(rootDir, '..')

// Assets & Resources
/** Path to the asset directory of the OsmGo project. */
export const assetsDir = path.join(rootDir, 'src', 'assets')
/** Path to the resources directory. */
export const resourcesDir = path.join(rootDir, 'resources')
/** Path to the directory in which SVG icons are stored. */
export const iconsSvgDir = path.join(resourcesDir, 'IconsSVG')

// i18n
/** Path to the i18n language files. */
export const i18nDir = path.join(assetsDir, 'i18n')

// Android
/** Path to the root directory of the Android project. */
export const androidDir = path.join(rootDir, 'android')

// Tags and Presets
/** Root directory of any tags and presets. */
export const tapDir = path.join(assetsDir, 'tagsAndPresets')
/** Path to the tags JSON file within tags and presets. */
export const tapTagsPath = path.join(tapDir, 'tags.json')
/** Path to the presets JSON file within tags and presets. */
export const tapPresetsPath = path.join(tapDir, 'presets.json')
/** Path to the basemap JSON file within tags and presets. */
export const tapBasemapPath = path.join(tapDir, 'basemap.json')
