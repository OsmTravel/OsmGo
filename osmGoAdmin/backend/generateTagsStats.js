const fs = require('fs-extra');
const through = require('through2');
const parseOSM = require('osm-pbf-parser');
const path = require('path');
const _ = require('lodash');

var argv = require('minimist')(process.argv.slice(2));
console.dir(argv);


const Config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
const osmGoAssetsPath = Config.osmGoAssetsPath

console.log(argv);


const language = argv.lang.split('-')[0]; //'fr';
const country = argv.lang.split('-')[1];  //'FR';
let pbfPath = argv.path; '/data/pbf/france-latest.osm.pbf';
// const pbfPath = '/data/pbf/rhone-alpes-latest.osm.pbf';

if (!language || !country || !pbfPath) {
    console.log('ex : node generateTagsStats.js --lang=fr-FR --path="/data/pbf/france-latest.osm.pbf"')
    return;
}

const ouputPath = path.join(__dirname, 'data', 'tagInfoLike', country);


const getTagsPath = (language, country) => {
    return path.join(osmGoAssetsPath, 'i18n', language, country, 'tags.json');
}

if (!fs.existsSync(pbfPath)) {
    console.error('file not exist')
    return;
}

if (!fs.existsSync(getTagsPath(language, country))) {
    console.error('country not exist in config file')
    return;
}

let osmGoTags = JSON.parse(fs.readFileSync(getTagsPath(language, country), 'utf8'))

if (!osmGoTags) {
    return;
}

fs.mkdirpSync(path.join(ouputPath, 'details'));

fs.writeFileSync(path.join(ouputPath, 'meta.json'), JSON.stringify(
    {
        'pbf': path.basename(pbfPath),
        'date': new Date()
    }
))

console.log(osmGoTags);
const pKeys = Object.keys(osmGoTags)


let sumaryPk = {};
let res = {}
for (let i = 0; i < pKeys.length; i++) {
    res[pKeys[i]] = {};
}

const sortByCount = (el) => {
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

const aggregate = (_pkey, _pvalue, elements) => {
    let blacklist = [
        ".*name.*",
        ".*source.*",
        "[0-9]+",
        ".*building.*",
        "opening_hours",
        "contact",
        "addr",
        ".*wikidata.*",
        ".*wikipedia.*",
        ".*wikimedia.*",
        ".*web.*",
        ".*phone.*",
        "ref.*",
        ".*survey.*",
        "description",
        "note",
        "fixme",
        "url",
        "ele",
        "start_date",
        "inscription.*",
        "image",
        "date_of_death",
        "mapillary",
        "title",
        "comment",
        "photo",
        ".*text.*",
        "designation",
        "facebook",
        "email",
        "fax",
        ".*naptan.*",
        "created_by"

    ];
    var re = new RegExp(blacklist.join("|"), "i");
    // console.log(re);
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
            let tagsArr = [];
            if (/;/.test(tags[key])) {
                tagsArr = tags[key].split(';').map(e => e.trim())
              
            } else {
                tagsArr = [tags[key]]
            }

            for (let tg of tagsArr) {
             
                let finded = currentKey['tags']
                    .find(el => el && el.value === tg);

                if (!finded) {
                    currentKey['tags'].push({ 'value': tg, 'count': 1 });
                    // console.log(res[key]);
                } else {
                    finded.count++;
                }
            }


            currentKey['count']++;
        }
    };

    sortByCount(res);
    // console.log(res);
    res = res.map( (r) => {
        sortByCount(r.tags)
        r.tags = r.tags.slice(0,100)
        return r;
    });
    return res;
}


var osm = parseOSM();
let c = 0;
fs.createReadStream(pbfPath)
    .pipe(osm)
    .pipe(through.obj(function (items, enc, next) {
        items.forEach(function (item) {

            if (Object.entries(item.tags).length > 0) {

                //    console.log(item.type);
                let keys = Object.keys(item.tags)
                let inter = _.intersection(pKeys, keys);
                let exclude = false;
                if (item.type == 'way' || item.type == 'relation') {
                    // console.log(inter);
                    for (let t of inter) {
                        if (osmGoTags[t]['exclude_way_values'] && osmGoTags[t]['exclude_way_values'].includes(item.tags[t])) {
                            exclude = true;
                        }
                    }
                }

                if (!exclude) {
                    for (let i = 0; i < inter.length; i++) {
                        let pValue = item.tags[inter[i]];
                        if (!/,/.test(pValue) && !/;/.test(pValue) && !/\//.test(pValue) && !/\s/.test(pValue.trim()) && !/[A-Z]/.test(pValue) ) {
                            c++;
                            if (c % 10000 === 0) {
                                console.log(item.tags);
                            }

                            if (!res[inter[i]][pValue] || !Array.isArray(res[inter[i]][pValue])) {
                                res[inter[i]][pValue] = []
                            }
                            res[inter[i]][pValue].push({ 'type': item.type, id: item.id, tags: item.tags })
                            // console.log(res[inter[i]][pValue]);
                        }
                    }
                }

            }
        });
        next();
    }, (next) => {
        console.log('Lecture fini')
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
                    fs.writeFileSync(path.join(ouputPath, 'details', `${pkey}=${pvalue}.json`), JSON.stringify(aggPkeyPvalue), 'utf8');
                } catch (error) {
                    console.log(`${pkey}=${pvalue}.json`, error);
                }

            }
            sortByCount(sumaryPk[pkey].values)
        }

        fs.writeFileSync(path.join(ouputPath, 'stats.json'), JSON.stringify(sumaryPk), 'utf8');
    }))


    ;