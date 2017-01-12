
function getPrimaryKeyOfObject(featureTags,listOfPrimaryKey ) {
        let kv = { k: '', v: '' };
        for (let k in featureTags) {
            if (listOfPrimaryKey.indexOf(k) !== -1) {
                kv = { k: k, v: featureTags[k] };
                return kv
            }
        }
        return null;
}

function getMarkerShape(feature) {
    if (feature.properties.tags.name) {
      feature.properties['_name'] = feature.properties.tags.name;
    }
    if (feature.properties.type === 'node') {
      return 'circle'
    }
    else {
      if (feature.properties.way_geometry.type === 'LineString' || feature.properties.way_geometry.type === 'MultiLineString') {
        return 'penta'
      } else if (feature.properties.way_geometry.type === 'Polygon' || feature.properties.way_geometry.type === 'MultiPolygon') {
        return 'square'
      } else {
        return 'star';
      }
    }
  }


function getConfigMarkerByKv(primaryTag, tags){
    for (let i = 0; i < tags.length; i++){
        if (tags[i].key == primaryTag.v){
            return tags[i];
        }
    }
    return null;
}

function getFeatureStyle(feature, listOfPrimaryKeys, tags){
    let primaryTag = getPrimaryKeyOfObject(feature.properties.tags,listOfPrimaryKeys);
     
    if (listOfPrimaryKeys.indexOf(primaryTag.k) !== -1){ //// c'est un objet à afficher
        let configMarker = getConfigMarkerByKv(primaryTag,tags[primaryTag.k].values);
      if (configMarker) { // OK
        //circle-red-mi-white-assistive-listening-system
        feature.properties.icon = (configMarker.icon) ? configMarker.icon : ''
        feature.properties.marker = getMarkerShape(feature) + '-' + configMarker.markerColor + '-' + feature.properties.icon;
        feature.properties.hexColor = configMarker.markerColor;

      } else { // on ne connait pas la 'value', donc pas de config pour le marker 
        feature.properties.marker = getMarkerShape(feature) + '-#000000-';
        feature.properties.icon = 'mi-white-circle'
        feature.properties.hexColor = '#000000';
      }
    }

    return feature;

}

function reponse(event){
    let listOfPrimaryKeys = event.data.listOfPrimaryKeys
    let tags = event.data.tags;
    let geojson = event.data.geojson;

    for (let i = 0; i < geojson.features.length; i++){
        geojson.features[i] =   getFeatureStyle(geojson.features[i],listOfPrimaryKeys,tags);
    }
  

        postMessage(geojson);
  }

  addEventListener("message",reponse,false);