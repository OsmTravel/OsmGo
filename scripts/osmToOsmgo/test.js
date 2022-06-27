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
const osmStr = fs.readFileSync(
    path.join(path.resolve(), 'fixture', 'f1.osm'),
    'utf8'
)

console.time('time')
const result = convert(osmStr, {
    tagConfig: tagConfig.tags,
    primaryKeys: tagConfig.primaryKeys,
})
// console.log(Object.keys(result));
console.log(result.geojson.features.length)
// tagConfig: tagsConfig,
//         primaryKeys: primaryKeys,
console.timeEnd('time')
// console.log('count:' , result.features.length);

// console.time('timeFull');
// const resultFull = convert(osmStr);
// console.timeEnd('timeFull');
// console.log('count:' , resultFull.features.length);
