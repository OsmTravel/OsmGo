const osmToOsmgo = require('./index.min.js')
const fs = require('fs')
const path = require('path')

const tagConfigPath = path.join('..','..','src','assets', 'tags&presets', 'tags.json')

const tagConfig = JSON.parse(fs.readFileSync(tagConfigPath, 'utf8'));
const osmStr = fs.readFileSync('./fixture/f8.osm', 'utf8')

console.time('time');
const result = osmToOsmgo.convert(osmStr, {tagConfig: tagConfig});
// console.log(result.geojson);
console.timeEnd('time');
console.log('count:' , result.geojson.features.length);

