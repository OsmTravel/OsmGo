import got from 'got'
import fs from 'fs-extra'
import path from 'path'
import stringify from 'json-stringify-pretty-compact'
import orderBy from 'lodash/orderBy'
import { assetsDir } from './_paths'
import * as cover from '@mapbox/tile-cover'
import SphericalMercator from '@mapbox/sphericalmercator'
import centroid from '@turf/centroid'

const url = `https://osmlab.github.io/editor-layer-index/imagery.geojson`

const ignoredIds: string[] = [
    'osm-mapnik-black_and_white', // ignored because it does not support CORS
    'EsriWorldImageryClarity', // ignored because it does not support CORS
]

// check if the url is valid and if it supports CORS
const checkUrl = async (feature: any) => {
    const maxZoom = feature.properties.max_zoom || 15
    const limits = { min_zoom: maxZoom - 1, max_zoom: maxZoom - 1 }

    let coords = [79.08096313476562, 21.135184856708992]
    if (feature.geometry) {
        try {
            const pointCentroid = centroid(feature)
            coords = pointCentroid.geometry.coordinates
        } catch (error) {
            console.error(error)
            return false
        }
    }
    const pointGeometry = {
        type: 'Point',
        coordinates: coords,
    }

    const [x, y, z] = cover.tiles(pointGeometry, limits)[0]
    const quadkey = tileToQuadkey(x, y, z)

    const merc = new SphericalMercator({
        size: 256,
        antimeridian: false,
    })
    const bbox = merc.bbox(x, y, z, false, '900913')

    const testUrl = feature.properties['tiles'][0]
        .replace('{x}', x)
        .replace('{y}', y)
        .replace('{-y}', -y)
        .replace('{z}', z)
        .replace('{bbox-epsg-3857}', bbox.join(','))
        .replace('{quadkey}', quadkey)

    try {
        const response = await got(testUrl, {
            responseType: 'text',
            timeout: 5000,
        })

        if (
            response.statusCode === 200 &&
            response.headers['access-control-allow-origin'] === '*'
        ) {
            return feature
        }
        return false
    } catch (error) {
        // console.error(error)
        return false
    }
}

const tileToQuadkey = (x, y, z) => {
    let quadkey = ''
    for (let i = z; i > 0; i--) {
        let digit = 0
        const mask = 1 << (i - 1)
        if ((x & mask) !== 0) {
            digit += 1
        }
        if ((y & mask) !== 0) {
            digit += 2
        }
        quadkey += digit
    }
    return quadkey
}

const run = async () => {
    console.log('Importing basemaps from')
    const data: any = await got(url).json()
    const features = data.features
    // const features = data.features.filter((feature:any) => feature.properties.id === 'Bing')

    let promisesCheckUrl = []
    for (const feature of features) {
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

        // zoom is too low for Osm Go
        if (feature.properties.max_zoom && feature.properties.max_zoom < 14) {
            continue
        }

        promisesCheckUrl.push(checkUrl(feature))
    }

    const resultCheckUrl = await Promise.all(promisesCheckUrl)

    const resultFeatures = resultCheckUrl.filter((f) => f !== false)
    const noValidBaseMaps = resultCheckUrl.filter((f) => f === false)

    console.log(
        'Valid base maps :',
        resultFeatures.length,
        'Invalid base maps :',
        noValidBaseMaps.length
    )

    const ordered = orderBy(
        resultFeatures,
        [
            (f) => (f.properties.id === 'Bing' ? 1 : 0),
            (f) => (f.properties.default ? 1 : 0),
            (f) => (f.properties.best ? 1 : 0),
            (f) => (f.properties.local ? 1 : 0),
        ],
        ['desc', 'desc', 'desc']
    )

    // list.sort((a, b) => (a.color > b.color) ? 1 : -1)

    const outPath = path.join(assetsDir, 'imagery.json')

    fs.writeFileSync(outPath, stringify(ordered), 'utf-8')
}

run()
