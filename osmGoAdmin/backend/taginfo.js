const rp = require('request-promise');
const fs = require('fs-extra');
const path = require('path');



const getStatsByKey = async (key, total = 200) => {

    var options = {
        uri: `https://taginfo.openstreetmap.org/api/4/key/values?key=${key}&page=1&rp=${total}&sortname=count_nodes&sortorder=desc`,
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
    return result;
}

const getStatsByKeys = async (keys, total =200) => {
    const result = {};

    for (let key of keys){
        console.log(key);
        const r = await getStatsByKey(key, total);

        result[key] = r
    }

    return result;
}


const generateKeyStatsFile = async () =>{
    const pKeys = [
        'advertising',
        'shop',
        'amenity',
        'public_transport',
        'emergency',
        'leisure',
        'craft',
        'tourism',
        'office',
        'man_made',
        'healthcare',
        'natural',
        'historic',
        'highway',
        'club'];

       const stats =  await getStatsByKeys(pKeys)
       fs.writeFileSync( path.join('.','data', 'stats.json'), JSON.stringify(stats), 'utf8');
}

generateKeyStatsFile()
// getStatsByKey('advertising').then(e => console.log(e)).catch(er => console.log(er));
// // getStatsByKeys(['advertising','shop'])