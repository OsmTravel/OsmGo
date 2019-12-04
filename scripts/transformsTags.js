const path = require("path");
const fs = require("fs-extra");
const stringify = require("json-stringify-pretty-compact");
const rp = require("request-promise");

const assetsFolder = path.join(__dirname, "..", "src", "assets");
const tagsOsmgoPath = path.join(assetsFolder, "tags&presets", "tags.json");
const newConfigPath = path.join(assetsFolder, "tags&presets", "newTags.json");

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, "utf8"));

const tagsResult = [];
const primaryKeys = [];
const excludeWays = {};

for (let pkey in tagsOsmgo) {
    primaryKeys.push(pkey)
    if (tagsOsmgo[pkey].exclude_way_values){
        excludeWays[pkey] = tagsOsmgo[pkey].exclude_way_values
    }
  for (let i = 0; i < tagsOsmgo[pkey].values.length; i++) {
    let tag = tagsOsmgo[pkey].values[i];
    tagsResult.push(tag);
  }
}
console.log(tagsResult.length);
console.log(primaryKeys);
console.log(excludeWays)
const result = {
    primaryKeys: primaryKeys,
    excludeWays: excludeWays,
    tags: tagsResult
}
fs.writeFileSync(newConfigPath, stringify(result));

