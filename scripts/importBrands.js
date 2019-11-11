const path = require('path');
const fs = require('fs-extra');
const stringify = require("json-stringify-pretty-compact")

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsPath = path.join(assetsFolder, 'tags&presets', 'tags.json');
const presetsPath = path.join(assetsFolder, 'tags&presets', 'presets.json');

const nsPath = path.join(__dirname, '..', '..', 'name-suggestion-index')
const brandsPath = path.join(nsPath, 'brands')
const ouputBrandsRep = path.join(assetsFolder, 'brands')

const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
// console.log(tags);


const formatBrandsNS = (brandsNSJson) => {
    let result = [];
    for (let k in brandsNSJson) {
        const lbl = k.split('|')[1];
        const v = brandsNSJson[k]['tags']['brand']
        const newObWithLbl = {
            "v": v,
            "lbl": { "en": lbl },
            ...brandsNSJson[k]
        }
        result = [...result, newObWithLbl]
        // console.log(newObWithLbl);
    }
    return result
}

const importBrandsToPresetsConfig = (presets, pkey, key) => {
    // amenity#fast_food#brand
    const id = `${pkey}#${key}#brand`
    const presetContent = {
        "key": "brand",
        "type": "list",
        "lbl": {"en": "Brand", "fr": "Enseigne", },
        "optionsFromJson": `brands/${pkey}/${key}.json`
      }
      presets[id] = presetContent;
      return presets // it's mutable... 
}

const importBrandsToTagsConfig = (tag, pkey, key) => {
    const id = `${pkey}#${key}#brand`

     // delete brand from presets if exist
     let brandIndex = undefined;
     for (let i = 0; i < tag.presets.length; i++){
         if (tag.presets[i] == 'brand' || /#brand/.test(tag.presets[i])){
            tag.presets.splice(i, 1);
            i = 0;
   
         }
     }
 

     // add presetId at first position
     tag.presets = [id, ...tag.presets];
     // mutable ?... yes
     return tag;
}

for (let pkey in tags) {
    for (let tag of tags[pkey].values) {
        // console.log(tag);
        // const tag = tags[pkey][k]
        // console.log(brandsPath, pkey, tag);
        const currentBrandPath = path.join(brandsPath, pkey, `${tag.key}.json`);
        // console.log(currentBrandPath);
        if (fs.existsSync(currentBrandPath)) {
            const brandNS = JSON.parse(fs.readFileSync(currentBrandPath, 'utf8'));
            const formatedBrandsNS = formatBrandsNS(brandNS)
            // console.log(formatedBrandsNS)
            fs.ensureDirSync(path.join(ouputBrandsRep, pkey))
            fs.writeFileSync(path.join(ouputBrandsRep, pkey, `${tag.key}.json`), stringify(formatedBrandsNS), 'utf8');

            importBrandsToPresetsConfig(presets,pkey,tag.key)
            importBrandsToTagsConfig(tag,pkey,tag.key)
        }
    }

    fs.writeFileSync(presetsPath, stringify(presets), 'utf8');
    fs.writeFileSync(tagsPath, stringify(tags), 'utf8');

}

// fs.writeFileSync(tagsPath, stringify(allTags), 'utf8');