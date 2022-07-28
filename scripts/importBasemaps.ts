import rp from 'request-promise'
import fs from 'fs-extra'
import path from 'path'
import stringify from 'json-stringify-pretty-compact'
import orderBy from 'lodash/orderBy'
import { assetsFolder } from './_paths'

const url = `https://osmlab.github.io/editor-layer-index/imagery.geojson`

const ignoredIds: string[] = [
    'osm-mapnik-black_and_white', // ignored because it does not support CORS
    'EsriWorldImageryClarity', // ignored because it does not support CORS
]

// const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'imagery.geojson')));

const run = async () => {
    const rep = await rp(url)
    // console.log
    const data = JSON.parse(rep)
    const features = data.features
    const resultFeatures = []
    for (const feature of features) {
        // TODO test on property support_cors,
        // if my PR is accepted https://github.com/osmlab/editor-layer-index/pull/1540

        if (ignoredIds.includes(feature.properties.id)) {
            // Ignore this imagery
            continue
        }

        let furl = feature.properties.url
        furl = furl.replace('{zoom}', '{z}')
        furl = furl.replace('{proj}', '3857')
        furl = furl.replace('{height}', '256')
        furl = furl.replace('{width}', '256')
        furl = furl.replace('{bbox}', '{bbox-epsg-3857}')

        // if {-y} => "scheme": "tms" ?
        feature.properties['tiles'] = []

        if (/\{apikey\}/.test(furl)) {
            continue
        }

        feature.properties['local'] = feature.geometry ? true : false

        if (feature.properties.id === 'Bing') {
            // CORS...
            feature.properties['tiles'] = [
                'https://ecn.t0.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
                'https://ecn.t1.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
                'https://ecn.t2.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
                'https://ecn.t3.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=587&mkt=en-gb&n=z',
            ]
            feature.properties['attribution'] = {
                required: true,
                text: 'Bing© 2022 Microsoft Corporation',
                url: 'https://blog.openstreetmap.org/2010/11/30/microsoft-imagery-details/',
            }
            feature.properties['max_zoom'] = 19
        } else if (feature.properties.id === 'fr.ign.bdortho') {
            feature.properties['tiles'] = [
                'https://wxs.ign.fr/pratique/geoportail/wmts?LAYER=ORTHOIMAGERY.ORTHOPHOTOS&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}',
            ]
            feature.properties['max_zoom'] = 19
        } else if (/\{switch\:/.test(furl)) {
            // const fswitch = furl.match(/{switch\:.*\}/g)
            const fswitch = furl.match(/\{switch:.+?\}/g)
            const parts = fswitch[0].split(':')[1].slice(0, -1).split(',')

            for (const part of parts) {
                const uri = furl.replace(/\{switch:.+?\}/g, part)
                feature.properties['tiles'].push(uri)
            }
        } else {
            feature.properties['tiles'].push(furl)
        }
        resultFeatures.push(feature)
        // console.log(resultFeatures);
        // console.log(feature.properties.url)
    }

    const ordered = orderBy(
        resultFeatures,
        [
            (f) => (f.properties.default ? 1 : 0),
            (f) => (f.properties.best ? 1 : 0),
            (f) => (f.properties.local ? 1 : 0),
        ],
        ['desc', 'desc', 'desc']
    )

    // list.sort((a, b) => (a.color > b.color) ? 1 : -1)

    const outPath = path.join(assetsFolder, 'imagery.json')

    fs.writeFileSync(outPath, stringify(ordered), 'utf-8')
}

run()
