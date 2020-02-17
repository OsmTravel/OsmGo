importScripts('../osmToOsmgo.min.js');

console.time('time')
function reponse(event) {
    let osmData = event.data.osmData;
    let oldGeojson = event.data.oldGeojson
    let oldBboxFeature = event.data.oldBboxFeature
    let geojsonChanged = event.data.geojsonChanged
    let tagsConfig = event.data.tagsConfig;

    let primaryKeys = event.data.primaryKeys;

    const result = osmToOsmgo.convert(osmData, 
        {
        tagConfig: tagsConfig,
        primaryKeys: primaryKeys,
        oldGeojson: oldGeojson, 
        geojsonChanged: geojsonChanged,
        oldBboxFeature: oldBboxFeature,

     }); 
     // return { geojson, geojsonBbox }

    // let geojsonFinal = mergeOldNewGeojsonData(oldGeojson,newGeojson,bbox_geojson,geojsonChanged );
    console.timeEnd('time')
    postMessage(result);
}

//ajout d'un listener
addEventListener("message", reponse, false);
