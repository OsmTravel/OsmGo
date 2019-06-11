const express = require('express');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const path = require('path')
const generateSprites = require('./generateSprite')
const app = express();
const stringify = require("json-stringify-pretty-compact")
const crypto = require('crypto');
app.use(bodyParser.json());

// let language = 'fr'
// let country = 'FR'
console.log('ok')

const getPresetsPath = (language, country) => {
    return path.join(__dirname, '..', '..', 'src','assets','i18n', language, country,  'presets.json');
}

const getTagsPath = (language, country) => {
    return path.join(__dirname, '..', '..', 'src','assets','i18n', language, country, 'tags.json');
}

const getSpritesPngPath = (language, country) => {
    return path.join(__dirname, '..', '..', 'src','assets','i18n', language, country, 'sprites.png');
}

const getSpritesJsonPath = (language, country) => {
    return path.join(__dirname, '..', '..', 'src','assets','i18n', language, country, 'sprites.json');;
}



const svgIconsDirPath = path.join(__dirname, '..', '..', 'src','assets','mapStyle', 'IconsSVG');


function error(res, error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send({ error });
}
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ text: 'Hello :-)' });
});

app.get('/api/i18', async (req, res) => {
    const dir = path.join(__dirname, '..', '..', 'src','assets','i18n');
    const list = await fs.readdir(dir);
    let i18 = {'tags' :[], 'interface':[] };

    for (let file of list){
        fileFullPath = path.resolve(dir, file);
        const fileStat = await fs.stat(fileFullPath)
        if (fileStat && fileStat.isDirectory()) {
            const dirCountry = await fs.readdir(fileFullPath);
            let regions = [];

            dirCountry.forEach( async region => {
                const tagsPath = path.join(fileFullPath,region, "tags.json");
                const tagsStr =  fs.readFileSync(tagsPath, 'utf8');
                const tagsHash = crypto.createHash('md5').update(tagsStr).digest("hex");

                const presetsPath = path.join(fileFullPath,region, "presets.json");
                const presetsStr =  fs.readFileSync(presetsPath, 'utf8');
                const presetsHash = crypto.createHash('md5').update(presetsStr).digest("hex");
                console.log(presetsHash);
                regions = [...regions, { region: region, tagsHash:tagsHash,presetsHash: presetsHash }]
            })

            i18.tags = [...i18.tags, { 'language': file, 'country': regions }]
        } else {
           if (path.extname(file) === '.json' && file !== 'i18n.json'){
            i18.interface = [...i18.interface, file.replace('.json','') ]
           } 
        }
    }
    res.send(i18)
})

app.get('/api/OsmGoTags/:language/:country', function (req, res) {
    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    fs.readFile(getTagsPath(language, country), 'utf8').then(data => {
        data = JSON.parse(data);
        res.send(data)
    })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
});

app.get('/api/OsmGoPresets/:language/:country', function (req, res) {
    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    fs.readFile(getPresetsPath(language, country), 'utf8').then(data => {
        data = JSON.parse(data);
        res.send(data)
    })
        .catch(err => {
            res.send(error(res, err))
        })
});



app.get('/api/svgList', function (req, res) {
    let excludeName = ["Create",
        "Delete",
        "Update",
        "arrow-position"]

    fs.readdir(svgIconsDirPath)
        .then(filesname => {
            res.send(filesname
                .filter(name => path.parse(name).ext == '.svg')
                .map(name => path.parse(name).name)
                .filter(name => excludeName.indexOf(name) == -1 )
            )
        })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/sprites/png/:language/:country',  (req, res) => {
    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'image/png; charset=UTF-8');
    fs.readFile(getSpritesPngPath(language, country)).then(data => {
        res.send(data)
    })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/sprites/json/:language/:country', function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    let language = req.params.language;
    let country = req.params.country;

    fs.readFile(getSpritesJsonPath(language, country), 'utf8').then(data => {
        res.send(data)
    })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/svg/:name', function (req, res) {
    res.setHeader('Content-Type', 'image/svg+xml; charset=UTF-8');
    let fileName = req.params.name;
    fs.readFile( path.join(svgIconsDirPath, `${fileName}.svg`), 'utf8').then(data => {
        res.send(data)
    })
        .catch(err => {
            res.send(error(res, err))
        })
});

// retourne un json contenant les stats d'utilisations des pValue
app.get('/api/PkeyStats/:pkey?', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let pkey = req.params.pkey;
    fs.readFile(path.join(__dirname,'data','stats.json'), 'utf8').then(data => {
        data = JSON.parse(data);
        if (!pkey) {
            res.send(data)
        } else {
            res.send(data[pkey])
        }
    })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/PkeyPvalueStat/:pkey/:pvalue/:key?', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let pkey = req.params.pkey;
    let pvalue = req.params.pvalue;
    let key = req.params.key;
    
    fs.readFile(path.join(__dirname,'data','agg', `${pkey}=${pvalue}.json`), 'utf8').then(data => {
        data = JSON.parse(data);
        if (key) {
            res.send(data.filter(el => el.key === key))
        } else {
            res.send(data)
        }

    })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/generateSprites/:language/:country', async (req, res) => {
    let language = req.params.language;
    let country = req.params.country;
    await generateSprites.generateSprites(language, country)
    res.send({"status":"ok"});
})

app.post('/api/tag/:language/:country', function (req, res) {
    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    const pkey = req.body.pkey;
    const newPvalue = req.body.newPvalue;
    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(data => {
            let jsonTags = JSON.parse(data);
            jsonTags[pkey].values.push(newPvalue)
            fs.writeFile( getTagsPath(language, country), stringify(jsonTags), 'utf8')
            .then( write => {
                res.send(write)
                console.log(write) 
            } )
            .catch( err => {
                console.log(err);
            })
        })
})


app.post('/api/tag/:language/:country/:key/:value', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let language = req.params.language;
    let country = req.params.country;
    let key = req.params.key;
    let value = req.params.value;
    // console.log(key , value);
    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(data => {
        let jsonTags = JSON.parse(data);
        // console.log(jsonTags[key])
        let findedIndex = jsonTags[key].values.findIndex( el => el.key === value );
        console.log('findedIndex',findedIndex);
        jsonTags[key].values[findedIndex] = req.body
    //    let currentTag =  jsonTags[key].values.filter( el => el.key === value)[0];
    //    currentTag = req.body;

       fs.writeFile( getTagsPath(language, country), stringify(jsonTags), 'utf8')
        .then( write => {
            res.send(write)
            console.log(write) 
        } )
        .catch( err => {
            console.log(err);
        })


    })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
});

app.post('/api/presets/:language/:country', function (req, res) {
    
    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    // post input => { primary : {key, value}, oldId, newid, data:{preset...}}

    const isNewId = req.body.ids.oldId !== req.body.ids.newId;
    console.log(req.body.ids.newId);
    fs.readFile(getPresetsPath(language, country), 'utf8')
        .then(data => {
        let jsonPresets = JSON.parse(data);
        const newId = req.body.ids.newId;
        console.log(newId);
        delete req.body.data._id
        jsonPresets[newId] = req.body.data
        console.log(jsonPresets[newId]);


       fs.writeFile( getPresetsPath(language, country), stringify(jsonPresets), 'utf8')
        .then( write => {
            if (!isNewId){
                res.send(write)
            } else { // on trouve le tag pour remplacer l'id du old au new, sinon on le push
                let tags = JSON.parse(fs.readFileSync(getTagsPath(language, country), 'utf8'));
                let currentTagIndex = tags[req.body.primary.key].values
                    .findIndex(el => el.key == req.body.primary.value )

                    console.log(currentTagIndex);
                    console.log(tags[req.body.primary.key].values[currentTagIndex]);
                    console.log(req.body.ids.newId);

                const index = tags[req.body.primary.key].values[currentTagIndex].presets.indexOf(req.body.ids.oldId);
                console.log('index', index);
                if (index){
                    tags[req.body.primary.key].values[currentTagIndex].presets[index] = req.body.ids.newId
                } else {
                    tags[req.body.primary.key].values[currentTagIndex].presets.push(req.body.ids.newId);
                }

                fs.writeFile( getTagsPath(language, country), stringify(tags), 'utf8')
                    .then( w => {
                        res.send(w);
                    });
                
            }
            
            console.log(write) 
        } )
        .catch( err => {
            console.log(err);
        })
    console.log(req.body);
        


    })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
    

    console.log('BODY', req.body.ids)

});


app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});
console.log('http://localhost:8080')
app.listen(8080);