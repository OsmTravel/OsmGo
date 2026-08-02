import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convert, mergeOldNewGeojsonData, wayToPoint } from './index.js'

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

const measuredGeometries = [
    {
        type: 'Polygon',
        coordinates: [
            [
                [0, 0],
                [0.01, 0],
                [0.01, 0.01],
                [0, 0.01],
                [0, 0],
            ],
        ],
    },
    {
        type: 'MultiPolygon',
        coordinates: [
            [
                [
                    [0, 0],
                    [0.01, 0],
                    [0.01, 0.01],
                    [0, 0.01],
                    [0, 0],
                ],
            ],
            [
                [
                    [0.02, 0.02],
                    [0.03, 0.02],
                    [0.03, 0.03],
                    [0.02, 0.03],
                    [0.02, 0.02],
                ],
            ],
        ],
    },
    {
        type: 'LineString',
        coordinates: [
            [0, 0],
            [0.01, 0.01],
        ],
    },
    {
        type: 'MultiLineString',
        coordinates: [
            [
                [0, 0],
                [0.01, 0.01],
            ],
            [
                [0.02, 0.02],
                [0.03, 0.03],
            ],
        ],
    },
]

for (const geometry of measuredGeometries) {
    const feature = {
        type: 'Feature',
        id: `way/${geometry.type}`,
        properties: { tags: {}, meta: {} },
        geometry: structuredClone(geometry),
    }

    wayToPoint(feature)

    assert.equal(feature.geometry.type, 'Point')
    assert.equal(feature.properties.way_geometry.type, geometry.type)
    assert.ok(feature.properties.mesure > 0)
}

const relationFixture = (elements) => ({
    bounds: { minlat: 0, minlon: 0, maxlat: 1, maxlon: 1 },
    elements,
})

assert.doesNotThrow(() =>
    convert(
        relationFixture([
            { type: 'relation', id: 1 },
            { type: 'relation', id: 2, members: [null] },
        ]),
        {}
    )
)

assert.doesNotThrow(() =>
    convert(
        relationFixture([
            {
                type: 'relation',
                id: 3,
                tags: { type: 'multipolygon', amenity: 'school' },
                members: [{ type: 'way', ref: 999, role: 'outer' }],
            },
        ]),
        {}
    )
)

const squareElements = [
    { type: 'node', id: 1, lat: 0, lon: 0 },
    { type: 'node', id: 2, lat: 0, lon: 0.01 },
    { type: 'node', id: 3, lat: 0.01, lon: 0.01 },
    { type: 'node', id: 4, lat: 0.01, lon: 0 },
    { type: 'way', id: 10, nodes: [1, 2, 3, 4, 1] },
]
const nestedRelations = convert(
    relationFixture([
        ...squareElements,
        {
            type: 'relation',
            id: 200,
            tags: { type: 'multipolygon', amenity: 'school' },
            members: [{ type: 'relation', ref: 100, role: 'outer' }],
        },
        {
            type: 'relation',
            id: 100,
            tags: { type: 'multipolygon', amenity: 'park' },
            members: [{ type: 'way', ref: 10, role: 'outer' }],
        },
    ]),
    {}
)
const nestedParent = nestedRelations.geojson.features.find(
    (feature) => feature.id === 'relation/200'
)
const nestedChild = nestedRelations.geojson.features.find(
    (feature) => feature.id === 'relation/100'
)
assert.ok(nestedParent)
assert.ok(nestedChild)
assert.equal(nestedParent.properties.way_geometry.type, 'Polygon')
assert.deepEqual(nestedChild.properties.relations, [
    {
        rel: 'relation/200',
        reltags: { type: 'multipolygon', amenity: 'school' },
        role: 'outer',
    },
])
