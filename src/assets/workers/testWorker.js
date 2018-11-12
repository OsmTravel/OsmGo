importScripts('../lib/parse5.js');
importScripts('../lib/turf.min.js');
importScripts('../osmtogeojson.js');

// console.log(importScripts('../lib/parse5.js'))


function reponse(event) {
    let osmData = event.data.osmData;
    let xml = parse(osmData)
    let result = osmtogeojson(xml).geojson;
    // console.log(parse5)
   
    // geojson.features = filterFeatures(geojson.features, event.data.tagsConfig)

    // let featuresWayToPoint = wayToPoint(geojson);
    // let result =  setIconStyle(featuresWayToPoint, event.data.tagsConfig);
    // console.log(result)

    //postMessage(event.data);


    postMessage(result);
}

//ajout d'un listener
addEventListener("message", reponse, false);
