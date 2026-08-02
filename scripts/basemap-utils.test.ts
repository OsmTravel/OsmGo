import assert from 'node:assert/strict'
import {
    buildTileTestUrl,
    compareImageryPriority,
    invertTmsY,
} from './basemap-utils'

assert.equal(invertTmsY(0, 1), 1)
assert.equal(invertTmsY(2, 3), 5)
assert.equal(
    buildTileTestUrl(
        'https://tiles.test/{z}/{x}/{-y}?xy={x},{y}&bbox={bbox-epsg-3857}&q={quadkey}',
        2,
        3,
        4,
        [1, 2, 3, 4],
        '0123'
    ),
    'https://tiles.test/4/2/12?xy=2,3&bbox=1,2,3,4&q=0123'
)

const ordered = [
    { properties: { best: false, local: true } },
    { properties: { best: true, local: false } },
].sort(compareImageryPriority)
assert.equal(ordered[0].properties.best, true)
