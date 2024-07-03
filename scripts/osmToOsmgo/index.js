import pointOnFeature from '@turf/point-on-feature'
import area from '@turf/area'
import length from '@turf/length'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import bboxPolygon from '@turf/bbox-polygon'

import * as martinez from 'martinez-polygon-clipping'

const inside = (point, vs) => {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0],
        y = point[1]

    var inside = false
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0],
            yi = vs[i][1]
        var xj = vs[j][0],
            yj = vs[j][1]
        var intersect =
            yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
        if (intersect) inside = !inside
    }
    return inside
}

const wayToPoint = (feature) => {
    // /!\ mutable !

    if (feature.geometry.type !== 'Point') {
        // stock the original geometry in  feature.properties.way_geometry  .way_geometry
        feature.properties.way_geometry = { ...feature.geometry }
        switch (feature.geometry.type) {
            case 'Polygon' || 'MultiPolygon':
                feature.properties['mesure'] = area(feature.geometry)
                break
            case 'LineString' || 'MultiLineString':
                // May be we can use CheapRuler
                feature.properties['mesure'] = length(feature)
                break
        }
        feature.geometry = pointOnFeature(feature.geometry).geometry
    }
}

/**
 * Check if the given tags describe a way that should be a polygon given OSM wiki definition:
 * https://wiki.openstreetmap.org/wiki/Overpass_turbo/Polygon_Features
 * @param {*} tags
 * @returns true if the tags describe a way that is 'always' a polygon
 */
const wayIsRealyPolygon = (tags) => {
    if (tags['area'] === 'no') return false
    const keys = Object.keys(tags)
    // is always polygon
    // TODO TEST if (keys.includes('area:highway') && tags['area:highway'] !== "no") return true;
    // FROM : https://github.com/tyrasd/osm-polygon-features/blob/master/polygon-features.json
    if (keys.includes('building') && tags['building'] !== 'no') return true
    if (keys.includes('landuse') && tags['landuse'] !== 'no') return true
    if (keys.includes('amenity') && tags['amenity'] !== 'no') return true
    if (keys.includes('leisure') && tags['leisure'] !== 'no') return true
    if (keys.includes('area') && tags['area'] !== 'no') return true
    if (keys.includes('place') && tags['place'] !== 'no') return true
    if (keys.includes('shop') && tags['shop'] !== 'no') return true
    if (keys.includes('boundary') && tags['boundary'] !== 'no') return true
    if (keys.includes('tourism') && tags['tourism'] !== 'no') return true
    if (keys.includes('historic') && tags['historic'] !== 'no') return true
    if (keys.includes('public_transport') && tags['public_transport'] !== 'no')
        return true
    if (keys.includes('office') && tags['office'] !== 'no') return true
    if (keys.includes('building:part') && tags['building:part'] !== 'no')
        return true
    if (keys.includes('military') && tags['military'] !== 'no') return true
    if (keys.includes('ruins') && tags['ruins'] !== 'no') return true
    if (keys.includes('craft') && tags['craft'] !== 'no') return true
    if (keys.includes('golf') && tags['golf'] !== 'no') return true
    if (keys.includes('indoor') && tags['indoor'] !== 'no') return true

    if (
        keys.includes('highway') &&
        ['services', 'rest_area', 'escape', 'elevator'].includes(
            tags['highway']
        )
    )
        return true
    if (
        keys.includes('waterway') &&
        ['riverbank', 'dock', 'boatyard', 'dam'].includes(tags['waterway'])
    )
        return true
    if (
        keys.includes('barrier') &&
        [
            'city_wall',
            'ditch',
            'hedge',
            'retaining_wall',
            'wall',
            'spikes',
        ].includes(tags['barrier'])
    )
        return true
    if (
        keys.includes('railway') &&
        ['station', 'turntable', 'roundhouse', 'platform'].includes(
            tags['railway']
        )
    )
        return true
    if (
        keys.includes('power') &&
        ['plant', 'substation', 'generator', 'transformer'].includes(
            tags['power']
        )
    )
        return true

    if (
        keys.includes('natural') &&
        !['coastline', 'cliff', 'ridge', 'arete', 'tree_row'].includes(
            tags['natural']
        )
    )
        return true
    if (
        keys.includes('man_made') &&
        !['cutline', 'embankment', 'pipeline'].includes(tags['man_made'])
    )
        return true
    if (keys.includes('aeroway') && !['taxiway'].includes(tags['aeroway']))
        return true
    return false
}

const isFilteredByKeys = (tags, keysFilter) => {
    // true => in final result
    if (!keysFilter) return true
    if (!tags) return false
    const keys = Object.keys(tags)

    for (let k of keys) {
        if (keysFilter.includes(k)) {
            return true
        }
    }
    return false
}

const getPrimaryKeyOfObject = (feature, primaryKeys) => {
    const tags = feature.properties.tags
    let kv = { k: '', v: '' }
    for (let k in tags) {
        if (primaryKeys.includes(k)) {
            kv = { k: k, v: tags[k] }
            return kv
        }
    }
    return null
}

export function getConfigTag(feature, presets) {
    const featureID = feature.properties.configId
    const featurePrimaryTag = `${feature.properties.primaryTag.k}/${feature.properties.primaryTag.v}`
    const featureTags = feature.properties.tags
    let mostMaches = 0

    let match = { exact: undefined, presets: [], moreFields: [] }
    for (let variant of presets) {
        const presetID = variant.id
        if (featureID) {
            // Save presets and moreFields from parent IDs
            if (featureID.includes(presetID)) {
                if (variant.presets)
                    match.presets = [...match.presets, ...variant.presets]
                if (variant.moreFields)
                    match.moreFields = [
                        ...match.moreFields,
                        ...variant.moreFields,
                    ]
            }
            if (featureID == presetID) {
                match.exact = variant
            }
        } else {
            if (!presetID.includes(featurePrimaryTag)) continue
            let matches = 0
            for (let key in variant.tags) {
                if (
                    !featureTags[key] ||
                    featureTags[key] !== variant.tags[key]
                ) {
                    continue
                } else {
                    matches++
                }
            }
            if (matches == Object.keys(variant.tags).length) {
                if (variant.presets)
                    match.presets = [...match.presets, ...variant.presets]
                if (variant.moreFields)
                    match.moreFields = [
                        ...match.moreFields,
                        ...variant.moreFields,
                    ]
                if (matches > mostMaches) {
                    match.exact = variant
                    mostMaches = matches
                }
            }
        }
    }

    if (match.exact) {
        let result = JSON.parse(JSON.stringify(match.exact)) // DeepCopy
        // Add presets and moreFields from parent IDs
        result.presets = match.presets
        result.moreFields = match.moreFields
        return result
    } else {
        // oops...
        const k = feature.properties.primaryTag.k ? 'k' : 'key'
        const v = feature.properties.primaryTag.k ? 'v' : 'value'

        const unkownsId = `${feature.properties.primaryTag[k]}/${feature.properties.primaryTag[v]}`
        const unkownsTagConfig = {
            key: feature.properties.primaryTag[k],
            icon: 'wiki-question',
            markerColor: '#000000',
            lbl: {
                en: `${feature.properties.primaryTag[k]} = ${feature.properties.primaryTag[v]}`,
            },
            presets: [],
            geometry: [],
            tags: {},
            id: unkownsId,
            unknowTags: true,
        }
        unkownsTagConfig['tags'][feature.properties.primaryTag[k]] =
            feature.properties.primaryTag[v]
        return unkownsTagConfig
    }
}

/*
export function getConfigTag(feature, tagsConfig) {
    // TODO : This should be optimized
    const featureTags = feature.properties.tags
    let match = { conf: undefined, matchProps: 0 }
    for (let variant of tagsConfig) {
        const firstKeyTag = Object.keys(variant.tags)[0] // we must have the first key of tag config
        let nb = 0
        for (let vk in variant.tags) {
            if (
                !featureTags[vk] ||
                featureTags[vk] !== variant.tags[vk] ||
                !featureTags[firstKeyTag]
            ) {
                nb = 0
                continue
            } else {
                nb++
            }
        }
        if (nb > match.matchProps) {
            match = { conf: variant, matchProps: nb }
        }
    }
    if (match.conf) {
        return match.conf
    } else {
        // oops...
        const k = feature.properties.primaryTag.k ? 'k' : 'key'
        const v = feature.properties.primaryTag.k ? 'v' : 'value'

        const unkownsId = `${feature.properties.primaryTag[k]}/${feature.properties.primaryTag[v]}`
        const unkownsTagConfig = {
            key: feature.properties.primaryTag[k],
            icon: 'wiki-question',
            markerColor: '#000000',
            lbl: {
                en: `${feature.properties.primaryTag[k]} = ${feature.properties.primaryTag[v]}`,
            },
            presets: [],
            geometry: [],
            tags: {},
            id: unkownsId,
            unknowTags: true,
        }
        unkownsTagConfig['tags'][feature.properties.primaryTag[k]] =
            feature.properties.primaryTag[v]
        return unkownsTagConfig
    }
}
*/

export function addAttributesToFeature(feature) {
    // /!\ mutable !
    // add properties values
    if (feature.properties.tags.name) {
        feature.properties['_name'] = feature.properties.tags.name
    } else if (feature.properties.tags.ref) {
        feature.properties['_name'] = feature.properties.tags.ref
    }

    if (feature.properties.meta.timestamp) {
        feature.properties.time = new Date(
            feature.properties.meta.timestamp
        ).getTime()
    }
    if (feature.properties.tags.fixme) {
        feature.properties.fixme = true
    }
}

export function setIconStyle(feature, tagsConfig) {
    // /!\ mutable

    let configMarker = getConfigTag(feature, tagsConfig)

    let markerShape
    if (feature.properties.type === 'node') {
        markerShape = 'circle'
    } else if (
        feature.properties.way_geometry.type === 'LineString' ||
        feature.properties.way_geometry.type === 'MultiLineString'
    ) {
        markerShape = 'penta'
    } else if (
        feature.properties.way_geometry.type === 'Polygon' ||
        feature.properties.way_geometry.type === 'MultiPolygon'
    ) {
        markerShape = 'square'
    } else {
        markerShape = 'star'
    }

    feature.properties.icon = configMarker.icon
        ? configMarker.icon
        : 'maki-circle'
    feature.properties.marker = `${markerShape}-${configMarker.markerColor}-${feature.properties.icon}`
    feature.properties.hexColor = configMarker.markerColor
    feature.properties.configId = configMarker.id
    if (configMarker.unknowTags) {
        feature.properties.unknowTags = true
    }

    if (configMarker.deprecated) {
        feature.properties['deprecated'] = configMarker.deprecated
    } else {
        if (feature.properties['deprecated']) {
            delete feature.properties['deprecated']
        }
    }
    addAttributesToFeature(feature)

    return feature
}

const getMergedGeojsonGeojsonChanged = (geojson, geojsonChanged) => {
    if (!geojsonChanged) {
        return geojson
    }
    // stock les id dans un array
    let changedIds = []
    for (let i = 0; i < geojsonChanged.features.length; i++) {
        changedIds.push(geojsonChanged.features[i].id)
    }
    //DELETE from GEOJSON
    for (let i = geojson.features.length - 1; i >= 0; i--) {
        if (changedIds.includes(geojson.features[i].id)) {
            geojson.features.splice(i, 1)
        }
    }
    return { ...geojson }
}

const mergeOldNewGeojsonData = (
    oldGeojson,
    newGeojson,
    newFeatureBbox,
    geojsonChanged
) => {
    let oldFeatures = oldGeojson.features
    let newFeatures = newGeojson.features

    if (!oldFeatures || oldFeatures.length == 0) {
        return newGeojson
    }

    //  le cas où une feature a été supprimé entre temps, on doit la supprimer de nos données:
    let id_features_deleted = []
    for (let i = 0; i < oldFeatures.length; i++) {
        // si la feature est dans la BBOX, on la push pour la supprimer
        if (booleanPointInPolygon(oldFeatures[i], newFeatureBbox)) {
            id_features_deleted.push(oldFeatures[i].id)
        }
    }
    for (let i = 0; i < newFeatures.length; i++) {
        let feature_id = newFeatures[i].id

        for (let j = 0; j < oldFeatures.length; j++) {
            if (feature_id == oldFeatures[j].id) {
                //la feature existe déjà dans nos données, on la remplace
                oldFeatures[j] = newFeatures[i]
                id_features_deleted.splice(
                    id_features_deleted.indexOf(feature_id),
                    1
                ) //la feature existe toujours, on la supprime du tableau
                break
            }
            if (j == oldFeatures.length - 1) {
                //la feature n'existe pas, on l'ajoute
                oldFeatures.push(newFeatures[i])
            }
        }
    }
    //parcours les features qui ont été supprimées pour les supprimer de nos données.
    for (let i = 0; i < id_features_deleted.length; i++) {
        let id_to_delete = id_features_deleted[i]
        for (let j = 0; j < oldFeatures.length; j++) {
            if (oldFeatures[j].id == id_to_delete) {
                oldFeatures.splice(j, 1)
                break
            }
        }
    }

    return getMergedGeojsonGeojsonChanged(oldGeojson, geojsonChanged)
}

const mergeBounds = (newBboxFeature, oldBboxFeature) => {
    if (!oldBboxFeature || oldBboxFeature.length === 0) {
        return { type: 'FeatureCollection', features: [newBboxFeature] }
    } else {
        // martinez union is fast !
        const unionBboxCoordinates = martinez.union(
            oldBboxFeature.geometry.coordinates,
            newBboxFeature.geometry.coordinates
        )
        let mergedFeature = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'MultiPolygon',
                coordinates: unionBboxCoordinates,
            },
        }
        return { type: 'FeatureCollection', features: [mergedFeature] }
    }
}

export const convert = (osmData, options) => {
    let keysFilter = null
    if (options && options.primaryKeys) {
        keysFilter = options.primaryKeys
    }

    const osm = typeof osmData == 'string' ? JSON.parse(osmData) : osmData
    const bounds = {
        minlat: Number(osm.bounds.minlat),
        minlon: Number(osm.bounds.minlon),
        maxlat: Number(osm.bounds.maxlat),
        maxlon: Number(osm.bounds.maxlon),
    }

    const bboxCoordinates = [
        bounds.minlon,
        bounds.minlat,
        bounds.maxlon,
        bounds.maxlat,
    ]

    const getWayGeometry = (ndRefs, _features) => {
        const firstNodeId = ndRefs[0]
        const lastNodeId = ndRefs[ndRefs.length - 1]
        const typeGeom = firstNodeId == lastNodeId ? 'Polygon' : 'LineString'

        let coordinates = []
        for (let i = 0; i < ndRefs.length; i++) {
            const ndId = `node/${ndRefs[i]}`
            if (_features[ndId]) {
                coordinates.push(_features[ndId].geometry.coordinates)
            } else {
                // 'TAINDED!'
            }
        }
        if (typeGeom == 'LineString') {
            return { type: 'LineString', coordinates: coordinates }
        } else if (typeGeom == 'Polygon') {
            return { type: 'Polygon', coordinates: [coordinates] }
        }
    }

    const getMultiPolygon = (_rel, _features) => {
        const rel = { ..._rel }
        let members = Array.isArray(rel.members) ? rel.members : [rel.members]
        rel['tainted'] = false
        for (let i = 0; i < members.length; i++) {
            let member = members[i]
            const memberId = `${member.type}/${member.ref}`

            if (_features[memberId]) {
                let g = _features[memberId].geometry
                let ring
                if (g.type === 'LineString') {
                    member['typeGeom'] = 'LineString'
                    ring = [...g.coordinates]
                } else if (g.type === 'Polygon') {
                    member['typeGeom'] = 'Polygon'
                    ring = [...g.coordinates[0]]
                }
                member['ring'] = ring
            } else {
                member['ring'] = null
                rel['tainted'] = true
            }
        }

        if (rel['tainted']) {
            return null
        }

        if (!Array.isArray(members)) {
            members = [members]
        }
        const outersPolygons = members.filter(
            (m) => m.role === 'outer' && m.typeGeom === 'Polygon' && m.ring
        )
        const innersPolygons = members.filter(
            (m) => m.role === 'inner' && m.typeGeom === 'Polygon' && m.ring
        )
        const outersLineString = members.filter(
            (m) => m.role === 'outer' && m.typeGeom === 'LineString' && m.ring
        )
        const innersLineString = members.filter(
            (m) => m.role === 'inner' && m.typeGeom === 'LineString' && m.ring
        )

        if (outersPolygons.length === 0 && outersLineString.length === 0) {
            // must be outer !
            return null
        }

        if (outersLineString.length > 0) {
            const chainedRings = chainLinestringToPolygonRigs(
                outersLineString.map((l) => l.ring)
            )
            for (let r of chainedRings) {
                outersPolygons.push({
                    type: 'way',
                    ref: '',
                    role: 'outer',
                    typeGeom: 'Polygon',
                    ring: r,
                })
            }
        }

        if (innersLineString.length > 0) {
            const chainedRings = chainLinestringToPolygonRigs(
                innersLineString.map((l) => l.ring)
            )
            for (let r of chainedRings) {
                innersPolygons.push({
                    type: 'way',
                    ref: '',
                    role: 'inner',
                    typeGeom: 'Polygon',
                    ring: r,
                })
            }
        }

        if (outersPolygons.length == 1) {
            // simple case ; 1 outer n inner
            const ring = [outersPolygons[0].ring]

            for (let innerPoly of innersPolygons) {
                ring.push(innerPoly.ring)
            }
            return { type: 'Polygon', coordinates: ring }
        } else {
            // > 1 outter rig => multipolygon
            const rings = outersPolygons.map((p) => [p.ring])

            for (let innerPoly of innersPolygons) {
                for (let i = 0; i < rings.length; i++) {
                    let outRing = rings[i][0]
                    const innerPolyFirstCoords = innerPoly.ring[0]
                    if (inside(innerPolyFirstCoords, outRing)) {
                        // test if the first coords of inner is in polygon
                        rings[i].push(innerPoly.ring)
                    }
                }
            }
            return { type: 'MultiPolygon', coordinates: rings }
        }
    }

    const chainLinestringToPolygonRigs = (rings) => {
        let resultRings = []
        let currentRing = rings[0].slice()
        rings.splice(0, 1)
        let crStart = currentRing[0].toString()
        let crEnd = currentRing[currentRing.length - 1].toString()
        let i = 0
        while (rings.length != 0 && i < rings.length) {
            if (rings[i][0].toString() == crEnd) {
                // delete the first coord of rig ant merge to result
                rings[i].splice(0, 1)
                currentRing = [...currentRing, ...rings[i]]
                rings.splice(i, 1)

                crStart = currentRing[0].toString()
                crEnd = currentRing[currentRing.length - 1].toString()

                i = 0
            } else if (rings[i][rings[i].length - 1].toString() == crStart) {
                // 'End ->Start'
                // delete the last coord of rig ant merge to result
                rings[i].splice(rings[i].length - 1, 1)
                currentRing = [...rings[i], ...currentRing]
                rings.splice(i, 1)

                crStart = currentRing[0].toString()
                crEnd = currentRing[currentRing.length - 1].toString()

                i = 0
            } else if (rings[i][0].toString() == crStart) {
                // console.log('Start ->Start', i)
                rings[i].splice(0, 1)
                currentRing = [...rings[i].reverse(), ...currentRing]
                rings.splice(i, 1)

                crStart = currentRing[0].toString()
                crEnd = currentRing[currentRing.length - 1].toString()
                i = 0
            } else if (rings[i][rings[i].length - 1].toString() == crEnd) {
                // console.log('End -> End', i)
                rings[i].splice(rings[i].length - 1, 1)
                currentRing = [...currentRing, ...rings[i].reverse()]
                rings.splice(i, 1)

                crStart = currentRing[0].toString()
                crEnd = currentRing[currentRing.length - 1].toString()
                i = 0
            } else {
                i++
            }

            if (crStart == crEnd) {
                // we have a polygon ring !
                resultRings.push(currentRing)
                if (rings.length > 0) {
                    currentRing = rings[0].slice()
                    rings.splice(0, 1)
                    crStart = currentRing[0].toString()
                    crEnd = currentRing[currentRing.length - 1].toString()
                    i = 0
                }
            }
        }
        return resultRings
    }

    const extractOsmGoData = (_features, tagConfig, primaryKeys) => {
        const featuresResult = []
        for (let idObject in _features) {
            const f = _features[idObject]

            if (f.properties.type == 'node') {
                if (f.geometry && f.properties.tags) {
                    if (tagConfig) {
                        let primaryTag = getPrimaryKeyOfObject(f, primaryKeys)
                        if (primaryTag) {
                            f.properties['primaryTag'] = primaryTag
                            setIconStyle(f, tagConfig)
                            featuresResult.push(f)
                        }
                    } else {
                        addAttributesToFeature(f)
                        featuresResult.push(f)
                    }
                }
            } else if (f.properties.type == 'way') {
                if (f.geometry && f.properties.tags) {
                    // transform geom
                    if (
                        f.geometry.type == 'Polygon' ||
                        f.geometry.type == 'MultiPolygon'
                    ) {
                        if (!wayIsRealyPolygon(f.properties.tags)) {
                            f.geometry.coordinates = f.geometry.coordinates[0]
                            f.geometry.type =
                                f.geometry.type == 'Polygon'
                                    ? 'LineString'
                                    : 'MultiLineString'
                        }
                    }
                    wayToPoint(f)
                    if (tagConfig) {
                        let primaryTag = getPrimaryKeyOfObject(f, primaryKeys)
                        if (primaryTag) {
                            f.properties['primaryTag'] = primaryTag
                            setIconStyle(f, tagConfig)
                            featuresResult.push(f)
                        }
                    } else {
                        addAttributesToFeature(f)
                        featuresResult.push(f)
                    }
                }
            } else if (f.properties.type == 'relation') {
                if (
                    f.geometry &&
                    f.properties.tags &&
                    isFilteredByKeys(f.properties.tags, keysFilter)
                ) {
                    // transform geom
                    if (
                        f.geometry.type == 'Polygon' ||
                        f.geometry.type == 'MultiPolygon'
                    ) {
                        if (!wayIsRealyPolygon(f.properties.tags)) {
                            f.geometry.coordinates = f.geometry.coordinates[0]
                            f.geometry.type =
                                f.geometry.type == 'Polygon'
                                    ? 'LineString'
                                    : 'MultiLineString'
                        }
                    }
                    wayToPoint(f)
                    if (tagConfig) {
                        let primaryTag = getPrimaryKeyOfObject(f, primaryKeys)

                        if (primaryTag) {
                            f.properties['primaryTag'] = primaryTag
                            setIconStyle(f, tagConfig)
                            featuresResult.push(f)
                        }
                    } else {
                        addAttributesToFeature(f)
                        featuresResult.push(f)
                    }
                }
            }
        }

        return featuresResult
    }

    const multiPolygonIds = []
    const _features = []
    for (let el of osm.elements) {
        if (el.type === 'node') {
            const node = el
            const n = {
                type: 'Feature',
                id: `node/${el.id}`,
                properties: {
                    type: 'node',
                    id: el.id,
                    meta: {
                        timestamp: el.timestamp,
                        version: el.version,
                        changeset: el.changeset,
                        user: el.user,
                        uid: el.uid,
                    },
                },

                geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
            }
            // add tags to properties tags
            if (el.tags) {
                n.properties['tags'] = el.tags
            }
            _features[`node/${node.id}`] = n
        } else if (el.type === 'way') {
            const way = el
            const w = {
                type: 'Feature',
                id: `way/${el.id}`,

                properties: {
                    type: 'way',
                    id: el.id,
                    meta: {
                        timestamp: el.timestamp,
                        version: el.version,
                        changeset: way.changeset,
                        user: el.user,
                        uid: el.uid,
                    },
                },
            }

            // add tags to properties tags
            if (el.tags) {
                w.properties['tags'] = el.tags
            }

            //add ndRefs
            if (el.nodes) {
                const ndRefs = []
                for (let refNodeId of el.nodes) {
                    ndRefs.push(refNodeId)
                    let nodeRef = _features[`node/${refNodeId}`] // add to the node
                    if (nodeRef) {
                        if (!nodeRef.properties['usedByWays']) {
                            nodeRef.properties['usedByWays'] = []
                        }
                        nodeRef.properties['usedByWays'].push(`way/${el.id}`)
                    }
                }
                w['ndRefs'] = ndRefs
                w['geometry'] = getWayGeometry(ndRefs, _features)
            }
            _features[`way/${el.id}`] = w
        } else if (el.type === 'relation') {
            const r = {
                type: 'Feature',
                id: `relation/${el.id}`,
                properties: {
                    type: 'relation',
                    id: el.id,
                    meta: {
                        timestamp: el.timestamp,
                        version: el.version,
                        changeset: el.changeset,
                        user: el.user,
                        uid: el.uid,
                    },
                },
                members: el.members,
                tainted: false,
            }

            if (el.tags) {
                r.properties['tags'] = el.tags
            }

            if (!Array.isArray(el.members)) {
                el.members = [el.members]
            }
            for (let m of el.members) {
                const refId = `${m.type}/${m.ref}`

                if (_features[refId]) {
                    if (!_features[refId]['properties']['relations'])
                        _features[refId]['properties']['relations'] = []
                    _features[refId].properties.relations.push({
                        rel: r.id,
                        reltags: r.properties.tags,
                        role: m.role,
                    })
                } else {
                    r['tainted'] = true
                    // le node référencé nexiste pas, rel => tained
                }
            }

            if (r.properties.tags.type === 'multipolygon') {
                // => We have to have all the relation first
                multiPolygonIds.push(`relation/${r.id}`)
            }
            _features[`relation/${r.id}`] = r
        }
    }

    for (const idMPolygon of multiPolygonIds) {
        // console.log(_features[idMPolygon]);
        const geom = getMultiPolygon(_features[idMPolygon], _features)
        if (geom) {
            _features[idMPolygon]['geometry'] = geom
        }
    }

    const featuresResult = extractOsmGoData(
        _features,
        options.tagConfig,
        options.primaryKeys
    )

    const geojson = {
        type: 'FeatureCollection',
        features: featuresResult,
    }

    if (options && options.oldGeojson && options.geojsonChanged) {
        const limit = Number.isInteger(options.limitFeatures)
            ? options.limitFeatures
            : 9999
        const newFeatureBbox = bboxPolygon(bboxCoordinates)

        // le nombre de features de l'ancien set de données dépasse la limite. On lui envoie donc que les nouvelles données.
        if (options.oldGeojson.features.length > limit) {
            const newGeojson = getMergedGeojsonGeojsonChanged(
                geojson,
                options.geojsonChanged
            )
            const newBboxGeojson = mergeBounds(newFeatureBbox, null)
            return { geojson: newGeojson, geojsonBbox: newBboxGeojson }
        } else {
            const newGeojson = mergeOldNewGeojsonData(
                options.oldGeojson,
                geojson,
                newFeatureBbox,
                options.geojsonChanged
            )
            const newBboxGeojson = mergeBounds(
                newFeatureBbox,
                options.oldBboxFeature
            )
            return { geojson: newGeojson, geojsonBbox: newBboxGeojson }
        }
    } else {
        return { geojson: geojson, geojsonBbox: null }
    }
}
