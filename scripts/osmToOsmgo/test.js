const osmToOsmgo = require('./index.min.js')
const fs = require('fs')
const path = require('path')

// import { convert } from './index.js'
// import * as fs from 'fs';
// import * as path from 'path';

const tagConfigPath = path.join('..','..','src','assets', 'tags&presets', 'tags.json')
const tagConfig = JSON.parse(fs.readFileSync(tagConfigPath, 'utf8'));
const osmStr = fs.readFileSync('./fixture/f10.osm', 'utf8')

const tags = tagConfig.tags
const primaryKeys = tagConfig.primaryKeys
const excludeWays = tagConfig.excludeWays

console.time('time')
const result = osmToOsmgo.convert(osmStr, {tagConfig: tags, excludesWays: excludeWays, primaryKeys:primaryKeys});
console.timeEnd('time');
// console.log(result.geojson);

console.log('count:' , result.geojson.features.length);

