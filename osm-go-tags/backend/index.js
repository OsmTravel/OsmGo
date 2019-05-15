// const request = require('request');
var request = require('request-promise');
var fs = require('fs');
var _ = require('lodash');
var stringify = require("json-stringify-pretty-compact")



// function getTagFromKeyValue(pKey, pValue, cb) {
//     let bbox = '42.42345,-5.31738,50.91688,8.06396'
//     let url = `https://overpass-api.de/api/interpreter?data=[out:json]
//     [timeout:500];
//     (node["${pKey}"="${pValue}"](${bbox});
//     way["${pKey}"="${pValue}"](${bbox});
//     );out tags;>;`;

//     request(url).then((response) => {
//         fs.writeFileSync(`./data/raw/${pKey}=${pValue}.json`, response)
//         return cb(response);
//     }, err => {
//         console.log(err);
//     })
// }

// getTagFromKeyValue('shop','bakery')
function aggregate(_pkey, _pvalue, rawData) {
    // let bak = fs.readFileSync('data/raw/shop=bakery.json', 'utf8')
    let elements = JSON.parse(rawData).elements;
    console.log(elements.length);


    let blacklist = [
        ".*name.*",
        ".*source.*",
        "[0-9]+",
        ".*building.*",
        "opening_hours",
        "contact",
        "addr"
    ];
    var re = new RegExp(blacklist.join("|"), "i");
    let res = [];
    for (let i = 0; i < elements.length; i++) {
        let tags = elements[i].tags;
        for (let key in tags) {
            let currentKey
            if (re.test(key)) { continue }
            currentKey = res
                .find(el => el && el.key === key);
            if (!currentKey) {
                currentKey = { 'key': key, 'tags': [], 'count': 0 };
                res.push(currentKey);
            }
            // console.log(currentKey);
            let finded = currentKey['tags']
                .find(el => el && el.value === tags[key]);

            if (!finded) {
                currentKey['tags'].push({ 'value': tags[key], 'count': 1 });
                // console.log(res[key]);
            } else {
                finded.count++;
            }
            currentKey['count']++;
        }
    };

    function sortByCount(el) {
        return el.sort((a, b) => {
            if (a.count < b.count) {
                return 1
            }
            if (a.count > b.count) {
                return -1
            }
            return 0
        });
    }
    sortByCount(res)
    res.map(function (tag) {
        return sortByCount(tag.tags);
    });

    fs.writeFileSync(`data/agg/${_pkey}=${_pvalue}.json`, stringify(res), 'utf8');

}
// aggregate('shop', 'hairdresser', fs.readFileSync('data/raw/shop=hairdresser.json', 'utf8'));


function exec(pkey, pvalue) {
    getTagFromKeyValue(pkey, pvalue, raw => {
        aggregate(pkey, pvalue, raw);
    })
}

