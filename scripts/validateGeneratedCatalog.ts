import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
    assetsDir,
    tapBrandPresetsPath,
    tapPresetsPath,
    tapTagsPath,
} from './_paths'

interface TagConfig {
    id: string
    icon?: string
    presets: string[]
    moreFields?: string[]
    geometry: string[]
    tags: Record<string, string | number>
}

interface Preset {
    key?: string
    keys?: string[]
    options?: Array<{ v: string }>
}

const tagsConfig = JSON.parse(fs.readFileSync(tapTagsPath, 'utf8')) as {
    primaryKeys: string[]
    tags: TagConfig[]
}
const basePresets = JSON.parse(
    fs.readFileSync(tapPresetsPath, 'utf8')
) as Record<string, Preset>
const brandPresets = JSON.parse(
    fs.readFileSync(tapBrandPresetsPath, 'utf8')
) as Record<string, Preset>
const presets = { ...basePresets, ...brandPresets }
const spritesDirectory = path.join(assetsDir, 'mapStyle', 'sprites')
const sprites = JSON.parse(
    fs.readFileSync(path.join(spritesDirectory, 'sprites.json'), 'utf8')
) as Record<string, unknown>
const sprites2x = JSON.parse(
    fs.readFileSync(path.join(spritesDirectory, 'sprites@2x.json'), 'utf8')
) as Record<string, unknown>

const unique = (values: string[], label: string): void => {
    assert.equal(new Set(values).size, values.length, `${label} must be unique`)
}

const supportedGeometries = new Set([
    'point',
    'vertex',
    'line',
    'area',
    'relation',
])
const tagIds = tagsConfig.tags.map((tag) => tag.id)
const presetIds = Object.keys(presets)
const spriteIds = Object.keys(sprites)
const generatedFileBudgets = new Map([
    [tapTagsPath, 8_000_000],
    [tapPresetsPath, 3_000_000],
    [tapBrandPresetsPath, 6_500_000],
    [path.join(assetsDir, 'imagery.json'), 3_500_000],
])

unique(tagIds, 'Tag IDs')
assert.ok(
    Object.keys(basePresets).every((id) => !id.endsWith('#brand')),
    'Base presets must not contain brand catalogs'
)
assert.ok(
    Object.keys(brandPresets).every((id) => id.endsWith('#brand')),
    'The lazy brand catalog must only contain brand presets'
)
unique(tagsConfig.primaryKeys, 'Primary keys')
assert.deepEqual(
    Object.keys(sprites2x).sort(),
    [...spriteIds].sort(),
    'DPR 1 and DPR 2 sprite indexes must contain the same IDs'
)

for (const tag of tagsConfig.tags) {
    assert.ok(tag.id.trim(), 'Every tag must have a non-empty ID')
    assert.ok(
        Object.keys(tag.tags).some((key) =>
            tagsConfig.primaryKeys.includes(key)
        ),
        `${tag.id} must use a declared primary key`
    )
    assert.ok(
        tag.geometry.length > 0 &&
            tag.geometry.every((geometry) => supportedGeometries.has(geometry)),
        `${tag.id} must only use supported geometries`
    )
    for (const presetId of [...tag.presets, ...(tag.moreFields ?? [])]) {
        assert.ok(presets[presetId], `${tag.id} references missing ${presetId}`)
    }
    if (tag.icon) {
        assert.ok(sprites[tag.icon], `${tag.id} references missing ${tag.icon}`)
    }
}

assert.ok(sprites['maki-circle'], 'The fallback map icon must exist')
for (const [presetId, preset] of Object.entries(presets)) {
    const fieldKeys = [
        ...(preset.key ? [preset.key] : []),
        ...(preset.keys ?? []),
    ]
    assert.ok(
        fieldKeys.length > 0 && fieldKeys.every((key) => key.trim()),
        `${presetId} must define valid field keys`
    )
    unique(preset.keys ?? [], `${presetId} alternative field keys`)
    unique(
        (preset.options ?? []).map((option) => option.v),
        `${presetId} option values`
    )
}

// Progressive floors catch accidental truncation while allowing upstream
// cleanup without pinning an exact generated result.
assert.ok(tagIds.length >= 1500, 'Generated tag count dropped below 1500')
assert.ok(presetIds.length >= 850, 'Generated preset count dropped below 850')
assert.ok(spriteIds.length >= 700, 'Generated sprite count dropped below 700')

for (const fileName of ['sprites.png', 'sprites@2x.png']) {
    assert.ok(
        fs.statSync(path.join(spritesDirectory, fileName)).size > 0,
        `${fileName} must be a non-empty file`
    )
}

for (const [filePath, maximumBytes] of generatedFileBudgets) {
    assert.ok(
        fs.statSync(filePath).size <= maximumBytes,
        `${path.basename(filePath)} exceeds its ${maximumBytes} byte budget`
    )
}

console.log(
    `Generated catalog valid: ${tagIds.length} tags, ${presetIds.length} presets, ${spriteIds.length} sprites.`
)
