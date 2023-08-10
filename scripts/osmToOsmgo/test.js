import { convert } from './index.js'
import * as fs from 'fs'
import * as path from 'path'

const tagConfigPath = path.join(
    path.resolve(),
    '..',
    '..',
    'src',
    'assets',
    'tagsAndPresets',
    'tags.json'
)
const tagConfig = JSON.parse(fs.readFileSync(tagConfigPath, 'utf8'))
// console.log( Object.keys(tagConfig));

const fixturePath = path.join(path.resolve(), 'fixture')
const f1 = fs.readFileSync(path.join(fixturePath, 'f1.osm'), 'utf8')
const osmMultipolygon = fs.readFileSync(
    path.join(fixturePath, 'multipolygon.json'),
    'utf8'
)

console.time('time_f1')
const result = convert(f1, {
    tagConfig: tagConfig.tags,
    primaryKeys: tagConfig.primaryKeys,
})
console.log('f1', result.geojson.features.length)
console.timeEnd('time_f1')

console.time('time_multipolygon')
const resultMp = convert(osmMultipolygon, {
    tagConfig: tagConfig.tags,
    primaryKeys: tagConfig.primaryKeys,
})
console.log('f1', resultMp.geojson.features.length)
console.timeEnd('time_multipolygon')
