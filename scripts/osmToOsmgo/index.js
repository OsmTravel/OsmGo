import parser from 'fast-xml-parser';
import pointOnFeature from '@turf/point-on-feature';
import area from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import bboxPolygon from '@turf/bbox-polygon'
// import turfUnion from '@turf/union'
import clone from 'lodash/clone'
import martinez from 'martinez-polygon-clipping'


const inside = (point, vs) => {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const wayToPoint = (feature) => { // /!\ mutable !
    if (feature.geometry.type !== 'Point') {
        // stock the original geometry in  feature.properties.way_geometry  .way_geometry
        feature.properties.way_geometry = clone(feature.geometry);
        switch (feature.geometry.type) {
            case 'Polygon' || 'MultiPolygon':
                if (typeof area == 'function') { // bug esm  ? :s area.default
                    feature.properties['mesure'] = area(feature.geometry)
                }
                break;
            case 'LineString' || 'MultiLineString':
                if (typeof length == 'function') {
                    feature.properties['mesure'] = length(feature)
                }
                break;
        }
        feature.geometry = pointOnFeature(feature.geometry).geometry;
    }
}

//https://wiki.openstreetmap.org/wiki/Overpass_turbo/Polygon_Features
const wayIsRealyPolygon = (tags) => {
    if (tags['area'] === 'no') return false;
    // FROM : https://github.com/tyrasd/osm-polygon-features/blob/master/polygon-features.json
    const keys = Object.keys(tags);
    // is always polygon
    if (keys.includes('building') && tags['building'] !== "no") return true;
    if (keys.includes('landuse') && tags['landuse'] !== "no") return true;
    if (keys.includes('amenity') && tags['amenity'] !== "no") return true;
    if (keys.includes('leisure') && tags['leisure'] !== "no") return true;
    if (keys.includes('area') && tags['area'] !== "no") return true;
    if (keys.includes('place') && tags['place'] !== "no") return true;
    if (keys.includes('shop') && tags['shop'] !== "no") return true;
    if (keys.includes('boundary') && tags['boundary'] !== "no") return true;
    if (keys.includes('tourism') && tags['tourism'] !== "no") return true;
    if (keys.includes('historic') && tags['historic'] !== "no") return true;
    if (keys.includes('public_transport') && tags['public_transport'] !== "no") return true;
    if (keys.includes('office') && tags['office'] !== "no") return true;
    if (keys.includes('building:part') && tags['building:part'] !== "no") return true;
    if (keys.includes('military') && tags['military'] !== "no") return true;
    if (keys.includes('ruins') && tags['ruins'] !== "no") return true;
    if (keys.includes('craft') && tags['craft'] !== "no") return true;
    if (keys.includes('golf') && tags['golf'] !== "no") return true;
    if (keys.includes('indoor') && tags['indoor'] !== "no") return true;

    if (keys.includes('highway') && ["services", "rest_area", "escape", "elevator"].includes(tags['highway'])) return true;
    if (keys.includes('waterway') && ["riverbank", "dock", "boatyard", "dam"].includes(tags['waterway'])) return true;
    if (keys.includes('barrier') && ["city_wall", "ditch", "hedge", "retaining_wall", "wall", "spikes"].includes(tags['barrier'])) return true;
    if (keys.includes('railway') && ["station", "turntable", "roundhouse", "platform"].includes(tags['railway'])) return true;
    if (keys.includes('power') && ["plant", "substation", "generator", "transformer"].includes(tags['power'])) return true;

    if (keys.includes('natural') && !["coastline", "cliff", "ridge", "arete", "tree_row"].includes(tags['natural'])) return true;
    if (keys.includes('man_made') && !["cutline", "embankment", "pipeline"].includes(tags['man_made'])) return true;
    if (keys.includes('aeroway') && !["taxiway"].includes(tags['aeroway'])) return true;
    return false;
}

const isFilteredByKeys = (tags, keysFilter) => { // true => in final result
    if (!keysFilter) return true;
    if (!tags) return false;
    const keys = Object.keys(tags);

    for (let k of keys) {
        if (keysFilter.includes(k)) {
            return true;
        }
    }
    return false
}

const getPrimaryKeyOfObject = (feature, excludesWays, primaryKeys) => {
    const tags = feature.properties.tags;
    let kv = { k: '', v: '' };
    for (let k in tags) {
        if (primaryKeys.includes(k)) {
            // on filtre ici pour ne pas prendre en compte les ways exclus
            if ((feature.properties.type == 'way' || feature.properties.type == 'relation')
                && excludesWays
                && excludesWays[k] 
                && excludesWays[k].includes(tags[k]) 
            ) {
                continue
            }
            kv = { k: k, v: tags[k] };
            return kv
        }
    }
    return null;
}

export function getConfigTag(feature, tagsConfig) {
    const fetureTags = feature.properties.tags

    let match = {conf: undefined, matchProps: 0};
    for (let variant of tagsConfig){
        let nb = 0;
        for( let vk in variant.tags){
            if (!fetureTags[vk] || fetureTags[vk] !== variant.tags[vk]){
                nb = 0;
                continue;
            }else {
                nb++;
            }
        }
        if (nb > match.matchProps){
            match = { conf: variant, matchProps: nb}
        }
    }
    if (match.conf) {
        return match.conf;
    } else {
        
        return null
    }
}

export function setIconStyle(feature, tagsConfig) { // /!\ mutable 

    let configMarker = getConfigTag(feature, tagsConfig);
  
    let markerShape
    if (feature.properties.type === 'node') {
        markerShape = 'circle'
    } else if (feature.properties.way_geometry.type === 'LineString' || feature.properties.way_geometry.type === 'MultiLineString') {
        markerShape = 'penta'
    } else if (feature.properties.way_geometry.type === 'Polygon' || feature.properties.way_geometry.type === 'MultiPolygon') {
        markerShape = 'square'
    } else {
        markerShape = 'star';
    }


    if (configMarker) { // OK
        feature.properties.icon = (configMarker.icon) ? configMarker.icon : ''
        feature.properties.marker = `${markerShape}-${configMarker.markerColor}-${feature.properties.icon}`
        feature.properties.hexColor = configMarker.markerColor;


    } else { // on ne connait pas la 'value', donc pas de config pour le marker
        feature.properties.icon = 'maki-circle'
        feature.properties.hexColor = '#000000';
        feature.properties.marker = `${markerShape}-#000000-`;
    }

    return feature;
}

const addAttributesToFeature = (feature) => { // /!\ mutable !
    // add properties values
    if (feature.properties.tags.name) {
        feature.properties['_name'] = feature.properties.tags.name
    }
    if (feature.properties.meta.timestamp) {
        feature.properties.time = (new Date(feature.properties.meta.timestamp)).getTime();
    }
    if (feature.properties.tags.fixme) {
        feature.properties.fixme = true;
    }
}


const getMergedGeojsonGeojsonChanged = (geojson, geojsonChanged) => {
    if (!geojsonChanged) {
        return geojson
    }
    // stock les id dans un array
    let changedIds = [];
    for (let i = 0; i < geojsonChanged.features.length; i++) {
        changedIds.push(geojsonChanged.features[i].id);
    }
    //DELETE from GEOJSON
    for (let i = geojson.features.length - 1; i >= 0; i--) {
        if (changedIds.includes(geojson.features[i].id)) {
            geojson.features.splice(i, 1);
        }
    }
    return clone(geojson)
}

const mergeOldNewGeojsonData = (oldGeojson, newGeojson, newFeatureBbox, geojsonChanged) => {
    let geojson = null;
    let oldFeatures = oldGeojson.features
    let newFeatures = newGeojson.features

    if (!oldFeatures || oldFeatures.length == 0) {
        return newGeojson;
    }

    else {
        //  le cas où une feature a été supprimé entre temps, on doit la supprimer de nos données:
        let id_features_deleted = [];
        for (let i = 0; i < oldFeatures.length; i++) { // si la feature est dans la BBOX, on la push pour la supprimer
            if (booleanPointInPolygon(oldFeatures[i], newFeatureBbox)) {
                id_features_deleted.push(oldFeatures[i].id)
            }
        }
        for (let i = 0; i < newFeatures.length; i++) {
            let feature_id = newFeatures[i].id;

            for (let j = 0; j < oldFeatures.length; j++) {
                if (feature_id == oldFeatures[j].id) { //la feature existe déjà dans nos données, on la remplace
                    oldFeatures[j] = newFeatures[i];
                    id_features_deleted.splice(id_features_deleted.indexOf(feature_id), 1); //la feature existe toujours, on la supprime du tableau
                    break;
                }
                if (j == oldFeatures.length - 1) {   //la feature n'existe pas, on l'ajoute
                    oldFeatures.push(newFeatures[i]);
                }
            }
        }
        //parcours les features qui ont été supprimées pour les supprimer de nos données.
        for (let i = 0; i < id_features_deleted.length; i++) {
            let id_to_delete = id_features_deleted[i];
            for (let j = 0; j < oldFeatures.length; j++) {
                if (oldFeatures[j].id == id_to_delete) {
                    oldFeatures.splice(j, 1);
                    break;
                }
            }
        }
        geojson = oldGeojson
    }
    return getMergedGeojsonGeojsonChanged(geojson, geojsonChanged);
}

const mergeBounds = (newBboxFeature, oldBboxFeature) => {
    if (!oldBboxFeature || oldBboxFeature.length === 0) {
        return { 'type': 'FeatureCollection', 'features': [newBboxFeature] };
    } else {
        // martinez union is fast !
        const unionBboxCoordinates = martinez(oldBboxFeature.geometry.coordinates, newBboxFeature.geometry.coordinates, 1)
        let mergedFeature = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": unionBboxCoordinates
            }
        };
        return { 'type': 'FeatureCollection', 'features': [mergedFeature] };
    }

}

function unescapeXmlValue(a) {
    return a
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

export const convert = (text, options) => {
    let keysFilter = null;
    if (options && options.primaryKeys ) {
        keysFilter =options.primaryKeys;
    }

    const jsonObj = parser.parse(text, {
        attributeNamePrefix: "",
        attrNodeName: false,
        textNodeName: "#text",
        ignoreAttributes: false,
        ignoreNameSpace: false,
        allowBooleanAttributes: true,
        parseNodeValue: false,
        parseAttributeValue: false,
        trimValues: false,
        cdataTagName: false, //default is 'false'
        cdataPositionChar: "\\c",
        attrValueProcessor: a => unescapeXmlValue(a),
        tagValueProcessor: a => unescapeXmlValue(a)
    });
    const osm = jsonObj.osm;
    const bounds = {
        minlat: Number(osm.bounds.minlat),
        minlon: Number(osm.bounds.minlon),
        maxlat: Number(osm.bounds.maxlat),
        maxlon: Number(osm.bounds.maxlon)
    }

    const bboxCoordinates = [bounds.minlon, bounds.minlat, bounds.maxlon, bounds.maxlat];

    const kvTagsTojson = (kvTags) => {
        if (!Array.isArray(kvTags)) {
            kvTags = [kvTags]
        }
        const tags = {};
        for (let i = 0; i < kvTags.length; i++) {
            tags[kvTags[i]['k']] = kvTags[i]['v']
        }
        return tags
    }

    const getWayGeometry = (ndRefs, _nodes) => {
        const firstNodeId = ndRefs[0];
        const lastNodeId = ndRefs[ndRefs.length - 1];
        const typeGeom = (firstNodeId == lastNodeId) ? 'Polygon' : 'LineString'

        let coordinates = [];
        for (let i = 0; i < ndRefs.length; i++) {
            const ndId = `node/${ndRefs[i]}`;
            if (_nodes[ndId]) {
                coordinates.push(_nodes[ndId].geometry.coordinates)
            } else {
                console.log('TAINDED!')
            }
        }
        if (typeGeom == 'LineString') {
            return { "type": "LineString", coordinates: coordinates }
        }
        else if (typeGeom == 'Polygon') {
            return { "type": "Polygon", coordinates: [coordinates] }
        }
    }


    const getMultiPolygon = (_rel, _ways, _relations) => {
        const rel = clone(_rel)
        let members = Array.isArray(rel.member) ? rel.member : [rel.member]
        rel['tainted'] = false;
        for (let i = 0; i < members.length; i++) {
            let member = members[i]
            const memberWayId = `way/${member.ref}`
            if (_ways[memberWayId]) {
                let g = _ways[memberWayId].geometry;
                let ring
                if (g.type === 'LineString') {
                    member['typeGeom'] = 'LineString'
                    ring = clone(g.coordinates)
                }
                else if (g.type === 'Polygon') {
                    member['typeGeom'] = 'Polygon'
                    ring = clone(g.coordinates[0])
                }
                member['ring'] = ring
            } else {
                member['ring'] = null;
                rel['tainted'] = true;
            }
        }

        if (rel['tainted']) {
            return null
        }

        if (!Array.isArray(members)) {
            members = [members]
        }
        const outersPolygons = members.filter(m => m.role === 'outer' && m.typeGeom === 'Polygon' && m.ring);
        const innersPolygons = members.filter(m => m.role === 'inner' && m.typeGeom === 'Polygon' && m.ring);
        const outersLineString = members.filter(m => m.role === 'outer' && m.typeGeom === 'LineString' && m.ring);
        const innersLineString = members.filter(m => m.role === 'inner' && m.typeGeom === 'LineString' && m.ring);
        // console.table([outersPolygons.length, innersPolygons.length, outersLineString.length, innersLineString.length]);

        if (outersPolygons.length === 0 && outersLineString.length === 0) { // must be outer !
            return null;
        }


        if (outersLineString.length > 0) {
            const chainedRings = chainLinestringToPolygonRigs(outersLineString.map(l => l.ring))
            for (let r of chainedRings) {
                outersPolygons.push({ type: 'way', ref: '', role: 'outer', typeGeom: 'Polygon', ring: r })
            }
        }

        if (innersLineString.length > 0) {
            const chainedRings = chainLinestringToPolygonRigs(innersLineString.map(l => l.ring))
            for (let r of chainedRings) {
                innersPolygons.push({ type: 'way', ref: '', role: 'inner', typeGeom: 'Polygon', ring: r })
            }
        }


        if (outersPolygons.length == 1) { // simple case ; 1 outer n inner
            const ring = [outersPolygons[0].ring];

            for (let innerPoly of innersPolygons) {
                ring.push(innerPoly.ring)
            }
            return { "type": 'Polygon', "coordinates": ring }
        }
        else { // > 1 outter rig => multipolygon
            const rings = outersPolygons.map(p => [p.ring]);

            for (let innerPoly of innersPolygons) {
                for (let i = 0; i < rings.length; i++) {
                    let outRing = rings[i][0]
                    const innerPolyFirstCoords = innerPoly.ring[0]
                    if (inside(innerPolyFirstCoords, outRing)) { // test if the first coords of inner is in polygon
                        rings[i].push(innerPoly.ring);
                    }
                }
            }
            return { "type": 'MultiPolygon', "coordinates": rings }
        }
    };

    const chainLinestringToPolygonRigs = (rings) => {
        let resultRings = [];
        let currentRing = rings[0].slice();
        rings.splice(0, 1)
        let crStart = currentRing[0].toString();
        let crEnd = currentRing[currentRing.length - 1].toString();
        let i = 0;
        while (rings.length != 0 && i < rings.length) {
            // console.log(rings.length)
            if (rings[i][0].toString() == crEnd) {
                // console.log('Start -> End', i)
                // delete the first coord of rig ant merge to result
                rings[i].splice(0, 1)
                currentRing = [...currentRing, ...rings[i]]
                rings.splice(i, 1)

                crStart = currentRing[0].toString();
                crEnd = currentRing[currentRing.length - 1].toString();

                i = 0
            }
            else if (rings[i][rings[i].length - 1].toString() == crStart) {
                // console.log('End ->Start', i)
                // delete the last coord of rig ant merge to result
                rings[i].splice(rings[i].length - 1, 1)
                currentRing = [...rings[i], ...currentRing]
                rings.splice(i, 1)

                crStart = currentRing[0].toString();
                crEnd = currentRing[currentRing.length - 1].toString();

                i = 0
            }
            else if (rings[i][0].toString() == crStart) {
                // console.log('Start ->Start', i)
                rings[i].splice(0, 1)
                currentRing = [...rings[i].reverse(), ...currentRing]
                rings.splice(i, 1)

                crStart = currentRing[0].toString();
                crEnd = currentRing[currentRing.length - 1].toString();
                i = 0

            }
            else if (rings[i][rings[i].length - 1].toString() == crEnd) {
                // console.log('End -> End', i)
                rings[i].splice(rings[i].length - 1, 1)
                currentRing = [...currentRing, ...rings[i].reverse()]
                rings.splice(i, 1)

                crStart = currentRing[0].toString();
                crEnd = currentRing[currentRing.length - 1].toString();
                i = 0
            }
            else {
                i++
            }

            if (crStart == crEnd) { // we have a polygon ring !
                resultRings.push(currentRing);
                if (rings.length > 0) {
                    currentRing = rings[0].slice();
                    rings.splice(0, 1);
                    crStart = currentRing[0].toString();
                    crEnd = currentRing[currentRing.length - 1].toString();
                    i = 0
                }
            }
        }
        return resultRings
    }


    const nodes = {} //
    if (!Array.isArray(osm.node)) { osm.node = osm.node ? [osm.node] : [] }
    for (let node of osm.node) {
        const id = `node/${node.id}`;
        const n = {
            "type": "Feature",
            "id": `node/${node.id}`,
            "properties":
            {
                "type": "node",
                "id": node.id,
                "meta": {
                    "timestamp": node.timestamp,
                    "version": node.version,
                    "changeset": node.changeset,
                    "user": node.user,
                    "uid": node.uid
                }
            },

            "geometry": { "type": "Point", "coordinates": [Number(node.lon), Number(node.lat)] }
        }

        // add tags to properties tags
        if (node.tag) {
            n.properties['tags'] = kvTagsTojson(node.tag)
        }
        nodes[id] = n;
    }

    /**
     * WAYS 
     */

    if (!Array.isArray(osm.way)) { osm.way = osm.way ? [osm.way] : [] }
    const ways = {} //
    for (let way of osm.way) {
        const id = `way/${way.id}`;
        const w = {
            "type": "Feature",
            "id": `way/${way.id}`,

            "properties":
            {
                "type": "way",
                "id": way.id,
                "meta": {
                    "timestamp": way.timestamp,
                    "version": way.version,
                    "changeset": way.changeset,
                    "user": way.user,
                    "uid": way.uid
                }
            }
        }

        // add tags to properties tags
        if (way.tag) {
            w.properties['tags'] = kvTagsTojson(way.tag)
        }

        //add ndRefs
        if (way.nd) {
            const ndRefs = [];
            for (let r of way.nd) {
                const refNodeId = r['ref']
                ndRefs.push(refNodeId)
                let nodeRef = nodes[`node/${refNodeId}`] // add to the node 
                if (nodeRef) {
                    if (!nodeRef.properties['usedByWays']) nodeRef.properties['usedByWays'] = [];
                    nodeRef.properties['usedByWays'].push(`way/${way.id}`)
                }
            }
            w['ndRefs'] = ndRefs
            w['geometry'] = getWayGeometry(ndRefs, nodes)
        }
        ways[id] = w;
    }


    /**
     * RELATIONS
     */
    const relations = {} //
    if (!Array.isArray(osm.relation)) { osm.relation = osm.relation ? [osm.relation] : [] }
    for (let rel of osm.relation) {
        const id = `${rel.id}`;
        const r = {
            "type": "Feature",
            "id": `${rel.id}`,
            "properties":
            {
                "type": "relation",
                "id": rel.id,
                "meta": {
                    "timestamp": rel.timestamp,
                    "version": rel.version,
                    "changeset": rel.changeset,
                    "user": rel.user,
                    "uid": rel.uid
                },
            },
            "member": rel.member,
            "tainted": false
        }

        if (rel.tag) {
            r.properties['tags'] = kvTagsTojson(rel.tag)
        }


        if (!Array.isArray(rel.member)) {
            rel.member = [rel.member]
        }
        for (let m of rel.member) {
            const refId = `${m.type}/${m.ref}`
            let target = m.type == 'node' ? nodes : ways;

            if (target[refId]) {
                if (!target[refId]['properties']['relations']) target[refId]['properties']['relations'] = [];
                target[refId].properties.relations.push({
                    rel: r.id,
                    reltags: r.properties.tags,
                    role: m.role
                })
            } else {
                r['tainted'] = true;
                // le node référencé nexiste pas, rel => tained
            }
        }
        relations[id] = r
    }

    // traitement des relation ... 
    for (let relId in relations) {
        const rel = relations[relId]
        if (rel.properties.tags.type === 'multipolygon') {
            const geom = getMultiPolygon(rel, ways, relations)
            if (geom) {
                rel['geometry'] = geom
            }
        }
    }

    const featuresResult = []
    for (let f in nodes) {
        const tags = nodes[f].properties.tags
        if (nodes[f].geometry && nodes[f].properties.tags && isFilteredByKeys(tags, keysFilter)) {
            addAttributesToFeature(nodes[f])
           
            if (options && options.tagConfig) {
                 let primaryTag = getPrimaryKeyOfObject(nodes[f], options.excludesWays, options.primaryKeys);
                if (primaryTag) {
                    nodes[f].properties['primaryTag'] = primaryTag;
                    setIconStyle(nodes[f], options.tagConfig)
                    featuresResult.push(nodes[f])
                }

            }
            else {
                featuresResult.push(nodes[f])
            }

        }
    }

    for (let f in ways) {
        const tags = ways[f].properties.tags
        if (ways[f].geometry && ways[f].properties.tags && isFilteredByKeys(tags, keysFilter)) {
            addAttributesToFeature(ways[f])
            // transform geom
            if (ways[f].geometry.type == 'Polygon' || ways[f].geometry.type == 'MultiPolygon') {
                if (!wayIsRealyPolygon(ways[f].properties.tags)) {
                    ways[f].geometry.coordinates = ways[f].geometry.coordinates[0];
                    ways[f].geometry.type = ways[f].geometry.type == 'Polygon' ? 'LineString' : 'MultiLineString'
                }
            }
            wayToPoint(ways[f])
            if (options && options.tagConfig) {
                let primaryTag = getPrimaryKeyOfObject(ways[f], options.excludesWays, options.primaryKeys)

                if (primaryTag) {
                    ways[f].properties['primaryTag'] = primaryTag;
                    setIconStyle(ways[f], options.tagConfig)
                    featuresResult.push(ways[f])
                }

            }
            else {
                featuresResult.push(ways[f])
            }


        }
    }

    for (let f in relations) {
        const tags = relations[f].properties.tags
        if (relations[f].geometry && relations[f].properties.tags && isFilteredByKeys(tags, keysFilter)) {
            // transform geom
            addAttributesToFeature(relations[f])
            if (relations[f].geometry.type == 'Polygon' || relations[f].geometry.type == 'MultiPolygon') {
                if (!wayIsRealyPolygon(relations[f].properties.tags)) {
                    relations[f].geometry.coordinates = relations[f].geometry.coordinates[0];
                    relations[f].geometry.type = relations[f].geometry.type == 'Polygon' ? 'LineString' : 'MultiLineString'
                }
            }
            wayToPoint(relations[f])
            if (options && options.tagConfig) {
                let primaryTag = getPrimaryKeyOfObject(relations[f], options.excludesWays, options.primaryKeys)

                if (primaryTag) {
                    relations[f].properties['primaryTag'] = primaryTag;
                    setIconStyle(relations[f], options.tagConfig)
                    featuresResult.push(relations[f])
                }

            } else {
                featuresResult.push(relations[f])
            }

        }
    }

    const geojson = {
        "type": "FeatureCollection",
        "features": featuresResult
    }


    if (options && options.oldGeojson && options.geojsonChanged) {
        const newFeatureBbox = bboxPolygon(bboxCoordinates);

        const newGeojson = mergeOldNewGeojsonData(options.oldGeojson, geojson, newFeatureBbox, options.geojsonChanged)
        const newBboxGeojson = mergeBounds(newFeatureBbox, options.oldBboxFeature);

        return { geojson: newGeojson, geojsonBbox: newBboxGeojson }
    } else {
        return { geojson: geojson, geojsonBbox: null }
    }


}