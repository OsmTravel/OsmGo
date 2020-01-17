const rp = require('request-promise');
const fs = require('fs-extra');
const path = require('path');
const stringify = require("json-stringify-pretty-compact")

const argv = require('yargs').argv

let language = argv['_'][0];


if (!language){
    console.error(language, 'oops')
    return 
}

let overwrite = false;

if (argv['_'][1] && argv['_'][1] == 'o'){
    overwrite = true;
}

const assetsFolder = path.join(__dirname, '..', 'src', 'assets')
const tagsOsmgoPath = path.join(assetsFolder, 'tags&presets', 'tags.json')

const tagsOsmgo = JSON.parse(fs.readFileSync(tagsOsmgoPath, 'utf8'));

const getStatsByKey = async (key )=> {

    var options = {
        uri: `https://taginfo.openstreetmap.org/api/4/key/values?key=${key}&page=1&sortname=count_nodes&sortorder=desc&lang=${language}`,
        json: true // Automatically parses the JSON string in the response
    };

    const res = await rp(options);

    const nbTotal = res.data.reduce( (acc, cur) => acc + cur.count, 0);
    const result =  
    {
        "key": key,
        "count": res.rp,
        "sum": nbTotal,
        "data_until": res.data_until,
        "values": [],
    }

    // console.log(nbTotal);

    for (let v of res.data){
        if (v.description && v.desclang === language){
            result.values.push(
                {
                    "value": v.value,
                    "count": v.count,
                    "fraction": v.fraction,
                    "fractionByKey": v.count / nbTotal,
                    "in_wiki": v.in_wiki,
                    "desclang:" : v.desclang,
                    "description": v.description
                }
            )
        }
     

    }
    // console.log(result);
    return result;
}

const pks = tagsOsmgo.primaryKeys;

const run = async () => {
   
    console.log(pks);
    console.log(overwrite);

    for (let pk of pks) {
        const tagInfoKey =  (await getStatsByKey(pk)).values
        // console.log(tagInfoKey);
        let tagsConfig = tagsOsmgo.tags;
 
        for (let tagConfig of tagsConfig) {
            let keys = Object.keys(tagConfig.tags)
            if ( keys.length == 1  && keys[0] === pk ){
                const value = tagConfig.tags[pk]
                const currentTagInfo = tagInfoKey.find( ti => ti.value === value)
                if (currentTagInfo && currentTagInfo.description){
                                 
                    if (tagConfig.description  && tagConfig.description[language] && overwrite === false ){
                        //nada
                    }else {
                        if (!tagConfig.description){
                            tagConfig['description'] = {'en': ''};
                        }
                        tagConfig['description'][language]= currentTagInfo.description
                        // console.log( currentTagInfo.description)
                    }
                }
            }
        }
    }
    fs.writeFileSync( tagsOsmgoPath, stringify(tagsOsmgo), 'utf8');
}

run();

// 