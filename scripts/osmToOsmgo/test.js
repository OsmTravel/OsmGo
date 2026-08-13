import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    addAttributesToFeature,
    convert,
    getConfigTag,
    mergeOldNewGeojsonData,
    setIconStyle,
    wayToPoint,
} from './index.js'

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
assert.equal(result.geojson.features.length, 1835)
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

const taggedBuildings = convert(
    relationFixture([
        ...squareElements.slice(0, 4),
        {
            type: 'way',
            id: 223148298,
            nodes: [1, 2, 3, 4, 1],
            tags: {
                building: 'retail',
                shop: 'supermarket',
                name: 'Netto',
            },
        },
        {
            type: 'way',
            id: 223146925,
            nodes: [1, 2, 3, 4, 1],
            tags: {
                building: 'commercial',
                shop: 'garden_centre',
                name: 'France Rurale',
            },
        },
        {
            type: 'way',
            id: 11,
            nodes: [1, 2, 3, 4, 1],
            tags: { building: 'yes' },
        },
    ]),
    {
        tagConfig: tagConfig.tags,
        primaryKeys: tagConfig.primaryKeys,
    }
)
const taggedBuildingById = new Map(
    taggedBuildings.geojson.features.map((feature) => [feature.id, feature])
)
assert.equal(
    taggedBuildingById.get('way/223148298').properties.configId,
    'shop/supermarket'
)
assert.equal(
    taggedBuildingById.get('way/223146925').properties.configId,
    'shop/garden_centre'
)
assert.equal(
    taggedBuildingById.get('way/11').properties.configId,
    'building/yes'
)

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

const hierarchyFeature = {
    properties: {
        configId: 'shop/car_parts',
        primaryTag: { key: 'shop', value: 'car_parts' },
        tags: { shop: 'car_parts' },
    },
}
const hierarchyConfig = getConfigTag(hierarchyFeature, [
    { id: 'shop/car', tags: {}, presets: ['wrong-parent'] },
    { id: 'shop', tags: {}, presets: ['shared', 'shared'] },
    {
        id: 'shop/car_parts',
        tags: { shop: 'car_parts' },
        presets: ['specific', 'shared'],
        moreFields: ['name', 'name'],
    },
])
assert.deepEqual(hierarchyConfig.presets, ['shared', 'specific'])
assert.deepEqual(hierarchyConfig.moreFields, ['name'])

const derivedFeature = {
    type: 'Feature',
    id: 'node/1',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {
        type: 'node',
        tags: { amenity: 'bench' },
        meta: {},
        primaryTag: { key: 'amenity', value: 'bench' },
        _name: 'stale',
        fixme: true,
        unknowTags: true,
    },
}
addAttributesToFeature(derivedFeature)
assert.equal(derivedFeature.properties._name, undefined)
assert.equal(derivedFeature.properties.fixme, undefined)
setIconStyle(derivedFeature, [
    {
        id: 'amenity/bench',
        tags: { amenity: 'bench' },
        icon: 'bench',
        markerColor: '#123456',
    },
])
assert.equal(derivedFeature.properties.unknowTags, undefined)

const twoOuterWays = [
    ...squareElements,
    { type: 'node', id: 5, lat: 0.02, lon: 0.02 },
    { type: 'node', id: 6, lat: 0.02, lon: 0.03 },
    { type: 'node', id: 7, lat: 0.03, lon: 0.03 },
    { type: 'node', id: 8, lat: 0.03, lon: 0.02 },
    { type: 'way', id: 11, nodes: [5, 6, 7, 8, 5] },
]
const multiLineRelation = convert(
    relationFixture([
        ...twoOuterWays,
        {
            type: 'relation',
            id: 300,
            tags: {
                type: 'multipolygon',
                area: 'no',
                man_made: 'cutline',
            },
            members: [
                { type: 'way', ref: 10, role: 'outer' },
                { type: 'way', ref: 11, role: 'outer' },
            ],
        },
    ]),
    {}
).geojson.features.find((feature) => feature.id === 'relation/300')
assert.ok(multiLineRelation)
assert.equal(multiLineRelation.properties.way_geometry.type, 'MultiLineString')
assert.equal(multiLineRelation.properties.way_geometry.coordinates.length, 2)

const supportedRelations = convert(
    relationFixture([
        ...squareElements,
        {
            type: 'relation',
            id: 400,
            tags: { type: 'multilinestring', man_made: 'cutline' },
            members: [{ type: 'way', ref: 10, role: '' }],
        },
        {
            type: 'relation',
            id: 401,
            tags: {
                type: 'public_transport',
                public_transport: 'stop_area',
            },
            members: [{ type: 'node', ref: 1, role: 'stop' }],
        },
    ]),
    {}
)
assert.equal(
    supportedRelations.geojson.features.find(
        (feature) => feature.id === 'relation/400'
    )?.properties.way_geometry.type,
    'MultiLineString'
)
assert.equal(
    supportedRelations.geojson.features.find(
        (feature) => feature.id === 'relation/401'
    )?.properties.way_geometry.type,
    'GeometryCollection'
)

const incompleteWay = convert(
    relationFixture([
        { type: 'node', id: 1, lat: 0, lon: 0 },
        {
            type: 'way',
            id: 500,
            nodes: [1, 999],
            tags: { highway: 'service' },
        },
    ]),
    {}
)
assert.equal(
    incompleteWay.geojson.features.some((feature) => feature.id === 'way/500'),
    false
)
