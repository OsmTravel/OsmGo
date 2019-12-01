const path = require("path");
const fs = require("fs-extra");
const stringify = require("json-stringify-pretty-compact");

const assetsFolder = path.join(__dirname, "..", "src", "assets");
const tagsPath = path.join(assetsFolder, "tags&presets", "tags.json");
const presetsPath = path.join(assetsFolder, "tags&presets", "presets.json");

const nsPath = path.join(__dirname, "..", "..", "name-suggestion-index");
const brandsPath = path.join(nsPath, "brands");

const tags = JSON.parse(fs.readFileSync(tagsPath, "utf8"));
const presets = JSON.parse(fs.readFileSync(presetsPath, "utf8"));

const formatBrandsNS = brandsNSJson => {
  let result = [];
  for (let k in brandsNSJson) {
    const lbl = k.split("|")[1];
    const v = brandsNSJson[k]["tags"]["brand"];
    const newObWithLbl = {
      v: v,
      lbl: { en: lbl },
      ...brandsNSJson[k]
    };
    result = [...result, newObWithLbl];
    // console.log(newObWithLbl);
  }
  return result;
};

const importBrandsToPresetsConfig = (presets, id, options) => {
  // amenity#fast_food#brand
  const keep = ["v", "lbl", "countryCodes", "tags"];

  options = options.map(o => {
    for (let k in o) {
      if (!keep.includes(k)) {
        delete o[k];
      }
    }
    return o;
  });

  const presetContent = {
    key: "brand",
    type: "list",
    lbl: { en: "Brand", fr: "Enseigne" },
    options: options
  };

  presets[id] = presetContent;
  return presets; // it's mutable...
};

for (let pkey in tags) {
  for (let tagConfig of tags[pkey].values) {
    if (Object.keys(tagConfig.tags).length == 1 && tagConfig.tags[pkey]) {
      const value = tagConfig.tags[pkey];
      const currentBrandPath = path.join(brandsPath, pkey, `${value}.json`);
      if (fs.existsSync(currentBrandPath)) {
        const brandNS = JSON.parse(fs.readFileSync(currentBrandPath, "utf8"));
        const brandOptions = formatBrandsNS(brandNS);
        const id = `${pkey}#${value}#brand`;
        importBrandsToPresetsConfig(presets, id, brandOptions);

        tagConfig.presets = tagConfig.presets.filter(p => !/brand/.test(p));
        tagConfig.presets = [id, ...tagConfig.presets];
      }
    }
  }
}

fs.writeFileSync(presetsPath, stringify(presets), "utf8");
fs.writeFileSync(tagsPath, stringify(tags), "utf8");
