var fs = require('fs');
var _ = require('lodash');
var osmread = require('osm-read');
var stringify = require("json-stringify-pretty-compact")
// osmread

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
    'highway']

let res = {}
for (let i = 0; i < pKeys.length; i++) {
    res[pKeys[i]] = {};
}

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

function aggregate(_pkey, _pvalue, elements) {
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

    sortByCount(res)
    res.map(function (tag) {
        return sortByCount(tag.tags);
    });
    return res;
    // fs.writeFileSync(`data/agg/${_pkey}=${_pvalue}.json`, stringify(res), 'utf8');

}

let sumaryPk = {};
let pbfPath = 'data/pbf/RA.osm.pbf';
var parser = osmread.parse({
    filePath: pbfPath,
    endDocument: () => {
        console.log('document end');

        for (let pkey in res) {
            if (!sumaryPk[pkey]) {
                sumaryPk[pkey] = { 'count': 0, 'sum': 0, 'values': [] };
            }

            for (let pvalue in res[pkey]) {
                if (/,/.test(pvalue) || /;/.test(pvalue)) {
                    continue;
                }
                sumaryPk[pkey].count++;
                sumaryPk[pkey].sum += res[pkey][pvalue].length
                sumaryPk[pkey].values.push({ 'value': pvalue, 'count': res[pkey][pvalue].length });
                let aggPkeyPvalue = aggregate(pkey, pvalue, res[pkey][pvalue])
                try {
                    fs.writeFileSync(`data/agg/${pkey}=${pvalue}.json`, stringify(aggPkeyPvalue), 'utf8');
                } catch (error) {
                    console.log('ohoh');
                }

            }
            sortByCount(sumaryPk[pkey].values)
        }

        fs.writeFileSync(`data/stats.json`, stringify(sumaryPk), 'utf8');
    },
    node: (node) => {
        let keys = Object.keys(node.tags)
        let inter = _.intersection(pKeys, keys);

        for (let i = 0; i < inter.length; i++) {

            let pValue = node.tags[inter[i]];
            if (!/,/.test(pValue) && !/;/.test(pValue)) {
                if (!res[inter[i]][pValue]) {
                    res[inter[i]][pValue] = []
                }

                res[inter[i]][pValue].push({ 'type': 'node', id: node.id, tags: node.tags })
            }

        }
    },
    way: function (way) {
        let keys = Object.keys(way.tags)
        let inter = _.intersection(pKeys, keys);

        for (let i = 0; i < inter.length; i++) {
            let pValue = way.tags[inter[i]];
            if (!/,/.test(pValue) && !/;/.test(pValue)) {
                if (!res[inter[i]][pValue]) {
                    res[inter[i]][pValue] = []
                }
                res[inter[i]][pValue].push({ 'type': 'way', id: way.id, tags: way.tags })
            }
        }
    },


    error: function (msg) {
        console.log('error: ' + msg);
    }
});

// you can pause the parser
parser.pause();

// and resume it again
parser.resume();