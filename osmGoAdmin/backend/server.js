const express = require('express');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const path = require('path')
const generateSprites = require('./generateSprite')
const app = express();
const stringify = require("json-stringify-pretty-compact")
const crypto = require('crypto');
const rp = require('request-promise');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const jwt = require('jsonwebtoken');
const Config = JSON.parse(fs.readFileSync( path.join(__dirname, 'config.json')));

const osmGoAssetsPath = Config.osmGoAssetsPath

const JWTSECRET = Config.jwtSecret
app.use(bodyParser.json());

// let language = 'fr'
// let country = 'FR'

const getPresetsPath = (language, country) => {
    return path.join(osmGoAssetsPath, 'i18n', language, country, 'presets.json');
}
const getTagsPath = (language, country) => {
    return path.join(osmGoAssetsPath, 'i18n', language, country, 'tags.json');
}
const getSpritesPngPath = (language, country) => {
    return path.join(osmGoAssetsPath, 'i18n', language, country, 'sprites.png');
}
const getSpritesJsonPath = (language, country) => {
    return path.join(osmGoAssetsPath, 'i18n', language, country, 'sprites.json');;
}
const uiLanguagePath = path.join(osmGoAssetsPath, 'i18n');
const svgIconsDirPath = path.join(osmGoAssetsPath, 'mapStyle', 'IconsSVG');


function error(res, error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send({ error });
}
app.get('/', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ text: 'Hello :-)' });
});

app.get('/api/i18', async (req, res) => {
    const dir = path.join(osmGoAssetsPath, 'i18n');
    const list = await fs.readdir(dir);
    let i18 = { 'tags': [], 'interface': [] };

    for (let file of list) {
        fileFullPath = path.resolve(dir, file);
        const fileStat = await fs.stat(fileFullPath)
        if (fileStat && fileStat.isDirectory()) {
            const dirCountry = await fs.readdir(fileFullPath);
            let regions = [];

            dirCountry.forEach(async region => {
                const tagsPath = path.join(fileFullPath, region, "tags.json");
                const tagsStr = fs.readFileSync(tagsPath, 'utf8');
                const tagsHash = crypto.createHash('md5').update(tagsStr).digest("hex");

                const presetsPath = path.join(fileFullPath, region, "presets.json");
                const presetsStr = fs.readFileSync(presetsPath, 'utf8');
                const presetsHash = crypto.createHash('md5').update(presetsStr).digest("hex");
                regions = [...regions, { region: region, tagsHash: tagsHash, presetsHash: presetsHash }]
            })

            i18.tags = [...i18.tags, { 'language': file, 'country': regions }]
        } else {
            if (path.extname(file) === '.json' && file !== 'i18n.json') {
                i18.interface = [...i18.interface, file.replace('.json', '')]
            }
        }
    }
    res.send(i18)
})

const veritfyJWT = (authorization) => {
    if (!authorization){
        return null;
    }
    const splited = authorization.split(' ');
    const bearer = splited[0];
    if (!bearer) {
        return null;
    }
    const jwtToken = splited[1]

    if (!jwtToken) {
        return null;
    }
    let user = null;
    try {
        user = jwt.verify(jwtToken, JWTSECRET);

    } catch (err) {
        console.log(jwtToken)
        console.log('JWT error', err)
        return null;
    }
    return user
}

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
                .filter(name => excludeName.indexOf(name) == -1)
            )
        })
        .catch(err => {
            res.send(error(res, err))
        })
});

app.get('/api/sprites/png/:language/:country', (req, res) => {
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
    fs.readFile(path.join(svgIconsDirPath, `${fileName}.svg`), 'utf8').then(data => {
        res.send(data)
    })
        .catch(err => {
            res.send(error(res, err))
        })
});


const getLanguageRegistry = () => {
    const str = fs.readFileSync(path.join(__dirname, 'data', 'registry.json'), 'utf8');
    const data = JSON.parse(str);
    return data
        .filter(l => l.Type === 'language')
        .map(l => {
            return { subtag: l.Subtag, desc: l.Description.join((', ')) }
        })
}


app.get('/api/addNewUILanguage', async (req, res) => {
    console.log(req.query);
    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    if (!req.query.lg){
        res.status(500).send('oups')
        return;
    }
    const newLanguage = req.query.lg.toLocaleLowerCase();

    const fromLg = 'en';
    const lgRegistry = getLanguageRegistry().find(l => l.subtag == newLanguage)
    if (!lgRegistry) {
        res.status(400).send('this language does not exist')
        return;
    }

    const newLanguagePath = path.join(uiLanguagePath, `${newLanguage}.json`)
    const fromLanguagePath = path.join(uiLanguagePath, `${fromLg}.json`)
    if (fs.existsSync(newLanguagePath)) {
        res.status(400).send('this language already exists')
        return;
    }
    fs.copyFileSync(fromLanguagePath, newLanguagePath);

    const list = await fs.readdir(uiLanguagePath);
    const uiLanguages = list
                    .filter( name => path.extname(name) === '.json' && name !== 'i18n.json')
                    .map( n => n.replace('.json', ''));

    const i18path = path.join(uiLanguagePath, 'i18n.json')
    const i18 = JSON.parse(fs.readFileSync( i18path), 'utf8')
    i18['interface'] = uiLanguages;
    fs.writeFileSync(i18path, stringify(i18), 'utf8')

    res.setHeader('Content-Type', 'application/json');
    res.send(lgRegistry)
});
// http://localhost:8080/api/addNewConfiguration?language=de&country=DE&fromLanguage=fr&fromCountry=FR
app.get('/api/addNewConfiguration', async (req, res) => {

    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }
    const newLanguage = req.query.language ?  req.query.language.toLowerCase() : null;
    const newCountry = req.query.country ? req.query.country.toUpperCase() : null;

    const fromLanguage = (req.query.fromLanguage) ? req.query.fromLanguage.toLowerCase() : 'en';
    const fromCountry = req.query.fromCountry ? req.query.fromCountry.toUpperCase() : 'GB';

    if (!newLanguage ||  !newCountry ){
        res.status(500).send('oups')
        return;
    } 


    const lgRegistry = getLanguageRegistry().find(l => l.subtag == newLanguage)
    if (!lgRegistry) {
        res.status(400).send('this language does not exist')
        return;
    }

    

    const fromPath = path.join(uiLanguagePath, fromLanguage, fromCountry )
   
    if (!fs.existsSync(fromPath)) {
        res.status(400).send('oups, la langue/region n`existe pas... ')
        return;
    }

    const newPath = path.join(uiLanguagePath, newLanguage, newCountry ) 
    if (fs.existsSync(newPath)) {
        res.status(400).send('this language already exists')
        return;
    }

    await fs.ensureDir(newPath);
    await fs.copy(fromPath, newPath)

    res.send({language : newLanguage, country : newCountry})
})


// retourne un json contenant les stats d'utilisations des pValue
app.get('/api/PkeyStats/:pkey?', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    let pkey = req.params.pkey;
    fs.readFile(path.join(__dirname, 'data', 'stats.json'), 'utf8').then(data => {
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

    fs.readFile(path.join(__dirname, 'data', 'agg', `${pkey}=${pvalue}.json`), 'utf8').then(data => {
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
    console.log(req.headers);
    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    let language = req.params.language;
    let country = req.params.country;

    await generateSprites.generateSprites(language, country)
    res.send({ "status": "ok" });
})

app.post('/api/tag/:language/:country', function (req, res) {
    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    const pkey = req.body.pkey;
    const newPvalue = req.body.newPvalue;


    const data = { ...newPvalue, userId: user.id, userName: user.display_name, time: new Date().getTime() }

    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(jsonStr => {
            let jsonTags = JSON.parse(jsonStr);
            jsonTags[pkey].values.push(data)
            fs.writeFile(getTagsPath(language, country), stringify(jsonTags), 'utf8')
                .then(() => {
                    res.send(data)
                    console.log(data)
                })
                .catch(err => {
                    console.log(err);
                })
        })
})


app.post('/api/tagSetting/:language/:country/:pkey',  (req, res) => {
    // const user = veritfyJWT(req.headers.authorization);
    // if (!user) {
    //     res.status(401).send('unautorized')
    //     return;
    // }

    let language = req.params.language;
    let country = req.params.country;
    let pkey = req.params.pkey;

    res.setHeader('Content-Type', 'application/json');
   
    const lbl = req.body.lbl;
    const exclude_way_values = req.body.exclude_way_values

    console.log(pkey, lbl, exclude_way_values, language, country)
 
    // const data = { ...newPvalue, userId: user.id, userName: user.display_name, time: new Date().getTime() }

    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(jsonStr => {
            let jsonTags = JSON.parse(jsonStr);
            jsonTags[pkey].lbl = lbl;
            jsonTags[pkey].exclude_way_values = exclude_way_values;
            fs.writeFile(getTagsPath(language, country), stringify(jsonTags), 'utf8')
                .then(() => {
                    res.send('ok')
                })
                .catch(err => {
                    console.log(err);
                })
        })
})


app.post('/api/tag/:language/:country/:key/:value', function (req, res) {
    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    res.setHeader('Content-Type', 'application/json');
    let language = req.params.language;
    let country = req.params.country;
    let key = req.params.key;
    let value = req.params.value;

    let data = req.body;
    // console.log(key , value);
    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(jsonTagsStr => {
            let jsonTags = JSON.parse(jsonTagsStr);
            // console.log(jsonTags[key])
            let findedIndex = jsonTags[key].values.findIndex(el => el.key === value);

            delete data._count;
            delete data._percentage

            data = { ...data, userId: user.id, userName: user.display_name, time: new Date().getTime() }

            jsonTags[key].values[findedIndex] = data


            fs.writeFile(getTagsPath(language, country), stringify(jsonTags), 'utf8')
                .then(() => {
                    res.send(data)
                    console.log(data)
                })
                .catch(err => {
                    console.log(err);
                })


        })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
});



app.delete('/api/tag/:language/:country/:key/:value', (req, res) => {

    let language = req.params.language;
    let country = req.params.country;
    let key = req.params.key;
    let value = req.params.value;
    res.setHeader('Content-Type', 'application/json');


    fs.readFile(getTagsPath(language, country), 'utf8')
        .then(data => {
            let jsonTags = JSON.parse(data);
            // console.log(jsonTags[key])
            let findedIndex = jsonTags[key].values.findIndex(el => el.key === value);
            jsonTags[key].values.splice(findedIndex, 1);

            fs.writeFile(getTagsPath(language, country), stringify(jsonTags), 'utf8')
                .then(write => {

                    res.send(stringify(jsonTags))

                })
                .catch(err => {
                    console.log(err);
                })
        })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
});

app.post('/api/presets/:language/:country', (req, res) => {

    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    let language = req.params.language;
    let country = req.params.country;

    res.setHeader('Content-Type', 'application/json');
    // post input => { primary : {key, value}, oldId, newid, data:{preset...}}

    const isNewId = req.body.ids.oldId !== req.body.ids.newId;
    fs.readFile(getPresetsPath(language, country), 'utf8')
        .then(data => {
            let jsonPresets = JSON.parse(data);
            const newId = req.body.ids.newId;
            delete req.body.data._id
            jsonPresets[newId] = req.body.data

            fs.writeFile(getPresetsPath(language, country), stringify(jsonPresets), 'utf8')
                .then(write => {
                    if (!isNewId) {
                        res.send(write)
                    } else { // on trouve le tag pour remplacer l'id du old au new, sinon on le push
                        let tags = JSON.parse(fs.readFileSync(getTagsPath(language, country), 'utf8'));
                        let currentTagIndex = tags[req.body.primary.key].values
                            .findIndex(el => el.key == req.body.primary.value)
                        const index = tags[req.body.primary.key].values[currentTagIndex].presets.indexOf(req.body.ids.oldId);

                        if (index) {
                            tags[req.body.primary.key].values[currentTagIndex].presets[index] = req.body.ids.newId
                        } else {
                            tags[req.body.primary.key].values[currentTagIndex].presets.push(req.body.ids.newId);
                        }

                        fs.writeFile(getTagsPath(language, country), stringify(tags), 'utf8')
                            .then(w => {
                                res.send(w);
                            });
                    }
                })
                .catch(err => {
                    console.log(err);
                })
        })
        .catch(err => {
            console.log(err);
            res.send(error(res, err))
        })
});

/* UI TRANSLATION */
app.get('/api/UiTranslation/:language/', async (req, res) => {
    let language = req.params.language;
    res.setHeader('Content-Type', 'application/json');
    const pathLCurrentLang = path.join(uiLanguagePath, `${language}.json`)
    let str = fs.readFileSync(pathLCurrentLang, 'utf8')
    const data = JSON.parse(str);
    res.send(data)
});

app.post('/api/UiTranslation/:language/', async (req, res) => {
    const user = veritfyJWT(req.headers.authorization);
    if (!user) {
        res.status(401).send('unautorized')
        return;
    }

    let language = req.params.language;
    res.setHeader('Content-Type', 'application/json');
    const newTranslation = req.body.newTranslation;
    const pathLCurrentLang = path.join(uiLanguagePath, `${language}.json`)
    let str = stringify(newTranslation);
    fs.writeFileSync(pathLCurrentLang, str, 'utf8')
    res.send(newTranslation)
});

const getUserFromOsmTokens = async (token, token_secret) => {

    const body = await rp({
        url: "https://www.openstreetmap.org/api/0.6/user/details",
        method: "GET",
        oauth: {
            consumer_key: "v2oE6nAar9KvIWLZHs4ip5oB7GFzbp6wTfznPNkr", // Supply the consumer key, consumer secret, access token and access secret for every request to the API.
            consumer_secret: "1M71flXI86rh4JC3koIlAxn1KSzGksusvA8TgDz7",
            token: token,
            token_secret: token_secret
        },
        headers: {
            "content-type": "text/xml" // Don't forget to set the content type as XML.
        }
    })
    const dom = new JSDOM(body);

    const u = dom.window.document.getElementsByTagName('user')[0];

    const user = {
        display_name: u.getAttribute('display_name'),
        id: u.getAttribute('id'),
    };
    const jwttoken = jwt.sign(user, JWTSECRET);
    console.log({ ...user, jwt: jwttoken });
    return { ...user, jwt: jwttoken };
}

app.get('/api/auth/', async (req, res) => {
    console.log(res);
    const token = req.query.token.replace(/"/g, '');
    const token_secret = req.query.token_secret.replace(/"/g, '');
    const user = await getUserFromOsmTokens(token, token_secret)
    res.setHeader('Content-Type', 'application/json');
    res.send(user);
});


// app.use(function (req, res, next) {
//     res.setHeader('Content-Type', 'text/plain');
//     res.status(404).send('Page introuvable !');
// });
console.log('http://localhost:8080')
app.listen(8080);