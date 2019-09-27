const osmToOsmgo = require('./index.min.js')
const fs = require('fs')

const tagConfig = JSON.parse(fs.readFileSync('./fixture/tagconfig.json', 'utf8'));
const osmStr = fs.readFileSync('./fixture/f9.osm', 'utf8')

console.time('time');
const result = osmToOsmgo(osmStr, {tagConfig: tagConfig});
console.timeEnd('time');
console.log('count:' , result.features.length);

console.time('timeFull');
const resultFull = osmToOsmgo(osmStr);
console.timeEnd('timeFull');
console.log('count:' , resultFull.features.length);