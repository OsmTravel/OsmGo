const path = require("path");
const fs = require("fs-extra");
const stringify = require("json-stringify-pretty-compact");
const rp = require("request-promise");

const assetsFolder = path.join(__dirname, "..", "src", "assets");
const tagsOsmgoPath = path.join(assetsFolder, "tags&presets", "tags.json");
const presetsOsmgoPath = path.join(
  assetsFolder,
  "tags&presets",
  "presets.json"
);

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, "utf8"));
const presetsOsmgo = fs.readJSONSync(presetsOsmgoPath);

for (let pkey in tagsOsmgo) {
  const uniqIds = [];
  const indexToDelete = [];

  for (let i = 0; i < tagsOsmgo[pkey].values.length; i++) {
    let tag = tagsOsmgo[pkey].values[i];

    if (tag.id) {
      if (!uniqIds.includes(tag.id)) {
        uniqIds.push(tag.id);
      } else {
        console.log("DOUBLON", tag.id);
        // console.log(i);
        indexToDelete.push(i);
      }
    } else {
      if (tag.iDRef) {
        tag.id = tag.iDRef;
      } else {
        console.log("PAS D'ID ", tag);
      }
    }

    // delete "key" property
    if (tag.key) {
      delete tag.key;
    }

   
    for (let pid of tag.presets) {
      if (!presetsOsmgo[pid]) {
        tag.presets = tag.presets.filter( e => e !== pid )
      }
    }

    if (tag.icon === undefined) {
      tag.icon = "";
      // console.log( tag.icon)
    }

    if (!tag.tags) {
      tag["tags"] = {};
      tag["tags"][pkey] = tag.key;
    }

    tag.presets = tag.presets.filter(p => p !== "name");

    if (!tag.id) {
      if (tag["iDRef"]) {
        tag["id"] = tag["iDRef"];
      } else {
        let newId = Object.keys(tag.tags)
          .map(k => `${k}/${tag.tags[k]}`)
          .join("#");
        console.log(newId);
        tag["id"] = newId;
      }
      // console.log(tag)
    }
  }

  for (let i = indexToDelete.length - 1; i >= 0; i--) {
    tagsOsmgo[pkey].values.splice(indexToDelete[i], 1);
  }

  console.log(indexToDelete);
}

fs.writeFileSync(tagsOsmgoPath, stringify(tagsOsmgo));

for (let pid in presetsOsmgo) {
  const preset = presetsOsmgo[pid];
  if (["select", "list"].includes(preset.type)) {
    if (!preset.options || preset.options.length < 2) {
      delete presetsOsmgo[pid];
    }
  }
}
fs.writeFileSync(presetsOsmgoPath, stringify(presetsOsmgo));
