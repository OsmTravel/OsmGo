import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convert, mergeOldNewGeojsonData } from './index.js'

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

const pointFeature = (id, coordinates, name, changeType) => ({
    type: 'Feature',
    id,
    properties: {
        name,
        ...(changeType ? { changeType } : {}),
    },
    geometry: { type: 'Point', coordinates },
})

const mergeBbox = {
    type: 'Feature',
    properties: {},
    geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
            ],
        ],
    },
}

const oldGeojson = {
    type: 'FeatureCollection',
    features: [
        pointFeature('node/stale', [0.25, 0.25], 'stale'),
        pointFeature('node/updated', [0.5, 0.5], 'old update'),
        pointFeature('node/outside', [2, 2], 'outside'),
        pointFeature('node/outside-updated', [3, 3], 'old outside update'),
        pointFeature('node/outside-kept', [4, 4], 'outside kept'),
    ],
}
const newGeojson = {
    type: 'FeatureCollection',
    features: [
        pointFeature('node/updated', [0.5, 0.5], 'new update'),
        pointFeature('node/outside-updated', [3, 3], 'new outside update'),
        pointFeature('node/new', [0.75, 0.75], 'new'),
    ],
}
const pendingGeojson = {
    type: 'FeatureCollection',
    features: [
        pointFeature('node/-1', [0.1, 0.1], 'pending create', 'Create'),
        pointFeature('node/updated', [0.5, 0.5], 'pending update', 'Update'),
        pointFeature('node/outside', [2, 2], 'pending delete', 'Delete'),
    ],
}
const oldSnapshot = structuredClone(oldGeojson)
const newSnapshot = structuredClone(newGeojson)
const pendingSnapshot = structuredClone(pendingGeojson)

const merged = mergeOldNewGeojsonData(
    oldGeojson,
    newGeojson,
    mergeBbox,
    pendingGeojson
)

assert.deepEqual(
    merged.features.map((feature) => [feature.id, feature.properties.name]),
    [
        ['node/outside-updated', 'new outside update'],
        ['node/outside-kept', 'outside kept'],
        ['node/new', 'new'],
    ]
)
assert.deepEqual(oldGeojson, oldSnapshot)
assert.deepEqual(newGeojson, newSnapshot)
assert.deepEqual(pendingGeojson, pendingSnapshot)

const mergeWithoutDeletionCandidates = mergeOldNewGeojsonData(
    {
        type: 'FeatureCollection',
        features: [pointFeature('node/outside', [2, 2], 'old')],
    },
    {
        type: 'FeatureCollection',
        features: [pointFeature('node/outside', [2, 2], 'new')],
    },
    mergeBbox,
    { type: 'FeatureCollection', features: [] }
)
assert.deepEqual(
    mergeWithoutDeletionCandidates.features.map(
        (feature) => feature.properties.name
    ),
    ['new']
)
