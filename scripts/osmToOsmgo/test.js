import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convert } from './index.js'

const converterDirectory = path.dirname(fileURLToPath(import.meta.url))
const tagConfigPath = path.join(
    converterDirectory,
    '..',
    '..',
    'src',
    'assets',
    'tagsAndPresets',
    'tags.json'
)
const tagConfig = JSON.parse(fs.readFileSync(tagConfigPath, 'utf8'))

const fixturePath = path.join(converterDirectory, 'fixture')
const f1 = fs.readFileSync(path.join(fixturePath, 'f1.osm'), 'utf8')
const osmMultipolygon = fs.readFileSync(
    path.join(fixturePath, 'multipolygon.json'),
    'utf8'
)

const result = convert(f1, {
    tagConfig: tagConfig.tags,
    primaryKeys: tagConfig.primaryKeys,
})
assert.equal(result.geojson.features.length, 1833)
assert.equal(result.geojsonBbox, null)

const resultMp = convert(osmMultipolygon, {
    tagConfig: tagConfig.tags,
    primaryKeys: tagConfig.primaryKeys,
})
assert.equal(resultMp.geojson.features.length, 3)

const emptyResult = convert(
    {
        bounds: { minlat: 0, minlon: 0, maxlat: 1, maxlon: 1 },
        elements: [],
    },
    {
        tagConfig: tagConfig.tags,
        primaryKeys: tagConfig.primaryKeys,
    }
)
assert.deepEqual(emptyResult, {
    geojson: { type: 'FeatureCollection', features: [] },
    geojsonBbox: null,
})

assert.throws(() => convert('invalid JSON', {}), SyntaxError)
