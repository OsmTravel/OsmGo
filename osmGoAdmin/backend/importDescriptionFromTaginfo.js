const rp = require('request-promise');
const fs = require('fs-extra');
const path = require('path');


const stringify = require("json-stringify-pretty-compact")

const language = 'en';
const country = 'GB';

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
            // console.log(v);
            result.values.push(
                {
                    "value": v.value,
                    "count": v.count,
                    "fraction": v.fraction,
                    "fractionByKey": v.count / nbTotal,
                    "in_wiki": v.in_wiki,
                    "description": v.description
                }
            )
        }
     

    }
    // console.log(result);
    return result;
}


// generateKeyStatsFile()
// getStatsByKey('advertising').then(e => console.log(e)).catch(er => console.log(er));
// // getStatsByKeys(['advertising','shop'])

// getStatsByKey('shop').then( e => console.log(e))


const run = async () => {
    const Config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
    const osmGoAssetsPath = Config.osmGoAssetsPath
    const osmgoTagsPath = path.join(osmGoAssetsPath, 'i18n', language, country, 'tags.json');
    const osmgoTags = JSON.parse(fs.readFileSync(osmgoTagsPath));
    
    
    for (let pk in osmgoTags) {
        const tagInfoKey =  (await getStatsByKey(pk)).values
        // console.log(tagInfoKey);
        let tags = osmgoTags[pk].values;
        for (let tag of tags) {
            const finded = tagInfoKey.find(e => e.value == tag.key)

            if (finded){
                tag['description'] = finded.description;
            }
        }
    }
    fs.writeFileSync( osmgoTagsPath, stringify(osmgoTags), 'utf8');
}

run();

// 