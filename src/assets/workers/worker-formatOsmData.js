importScripts('../lib/turf.min.js');
importScripts('../osmtogeojson.js');


function getListOfPrimaryKey(tagsConfig) {
    let listeOfPrimaryKey = [];
    for (let key in tagsConfig) {
        listeOfPrimaryKey.push(key);
    }
    return listeOfPrimaryKey;

}

function getPrimaryKeyOfObject(feature, tagsConfig) {
    // console.log(feature)
    const tags = feature.properties.tags
    // console.log(tags)
    let types_liste = getListOfPrimaryKey(tagsConfig);
    let kv = { k: '', v: '' };
    for (let k in tags) {
        // console.log(k);
        if (types_liste.indexOf(k) !== -1) {
            // on filtre ici pour ne pas prendre en compte les ways exclus
            if ((feature.properties.type == 'way' || feature.properties.type == 'relation')
                && tagsConfig[k].exclude_way_values
                && tagsConfig[k].exclude_way_values.indexOf(tags[k]) !== -1
            ) {
                continue
            }
            kv = { k: k, v: tags[k] };
            // console.log(kv)
            return kv
        }
    }
    return null;
}

function filterFeatures(features, tagsConfig) {
    let filterFeatures = [];
    for (let i = 0; i < features.length; i++) {
        let feature = features[i];
        if (!feature.properties.tainted) { // !relation incomplete
            let primaryTag = getPrimaryKeyOfObject(feature, tagsConfig);
            if (primaryTag) { //tag interessant
                feature.properties['primaryTag'] = primaryTag;

                filterFeatures.push(feature);
            }
        }
    }
    return filterFeatures;
}


// on en profite pour calculer les distances/surface
function wayToPoint(FeatureCollection) {
    let features = FeatureCollection.features;
    for (let i = 0; i < features.length; i++) {
        let feature = features[i];
        // console.log(feature);
        if (feature.geometry) {
            if (feature.geometry.type !== 'Point') {

                // on stocke la géométrie d'origine dans .way_geometry
                feature.properties.way_geometry = JSON.parse(JSON.stringify(feature.geometry));
                let geom;
                switch (feature.geometry.type) {
                    case 'Polygon':
                        feature.properties['mesure'] = turf.area(feature.geometry)
                        geom = turf.polygon(feature.geometry.coordinates);
                        break;
                    case 'MultiPolygon':
                        feature.properties['mesure'] = turf.area(feature.geometry)
                        geom = turf.multiPolygon(feature.geometry.coordinates);
                        break;
                    case 'LineString':
                        feature.properties['mesure'] = turf.length(feature.geometry)
                        geom = turf.lineString(feature.geometry.coordinates);
                        break;
                    case 'MultiLineString':
                        feature.properties['mesure'] = turf.length(feature.geometry)
                        geom = turf.multiLineString(feature.geometry.coordinates);
                        break;
                }

                if (geom) {
                    feature.geometry.coordinates = turf.pointOnSurface(geom).geometry.coordinates;
                    feature.geometry.type = 'Point';
                }
            }
        }
    }
    return FeatureCollection;
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

function getConfigMarkerByKv(primaryTag, tagsConfig) {
   let config =  tagsConfig[primaryTag.k].values.filter( t => t.key === primaryTag.v);
   if (config.length >  0 ){
       return config[0]
   }else {
       return null
   }
}



function getIconStyle(feature, tagsConfig) {
    let primaryTag = feature.properties['primaryTag']; // {k: "shop", v: "travel_agency"}

        let configMarker = getConfigMarkerByKv(primaryTag, tagsConfig);
        
        if (configMarker) { // OK
            // console.log(configMarker)
            feature.properties.icon = (configMarker.icon) ? configMarker.icon : ''
            feature.properties.marker = getMarkerShape(feature) + '-' + configMarker.markerColor + '-' + feature.properties.icon;
            feature.properties.hexColor = configMarker.markerColor;

        } else { // on ne connait pas la 'value', donc pas de config pour le marker
            feature.properties.icon = 'maki-circle-15'
            feature.properties.hexColor = '#000000';
            feature.properties.marker = getMarkerShape(feature) + '-#000000-';
        }
    // }
    return feature;
}

function setIconStyle(FeatureCollection, tagsConfig) {
    let features = FeatureCollection.features;
    for (let i = 0; i < features.length; i++) {
        let feature = features[i];
        this.getIconStyle(feature, tagsConfig); // lent....
    }
    return FeatureCollection;
}

function getMergedGeojsonGeojsonChanged(geojson,geojsonChanged) {
    if (!geojsonChanged){
        return geojson
    }
    // stock les id dans un array
    let changedIds = [];
    for (let i = 0; i < geojsonChanged.features.length; i++) {
        changedIds.push(geojsonChanged.features[i].id);
    }
    //DELETE from GEOJSON
    for (let i = geojson.features.length - 1; i >= 0; i--) {
        if (changedIds.indexOf(geojson.features[i].id) != -1) {
            geojson.features.splice(i, 1);
        }
    }
    return JSON.parse(JSON.stringify(geojson))
}

function mergeOldNewGeojsonData(oldGeojson,newGeojson,bbox_geojson,geojsonChanged ){
    let geojson = null;
    let oldFeatures = oldGeojson.features 
    let newFeatures = newGeojson.features

      if (!oldFeatures || oldFeatures.length == 0) {
        return newGeojson;
      } 
      
      else{
        //  le cas où une feature a été supprimé entre temps, on doit la supprimer de nos données:
          let id_features_deleted = [];
          for (let i = 0; i < oldFeatures.length; i++) { // si la feature est dans la BBOX, on la push pour la supprimer
              if (turf.inside(oldFeatures[i], bbox_geojson)) {
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
      return getMergedGeojsonGeojsonChanged(geojson,geojsonChanged);
}


function reponse(event) {
    let newGeojson = event.data.osmData;
    let oldGeojson = event.data.oldGeojson
    let bbox_geojson = event.data.featureBbox
    let geojsonChanged = event.data.geojsonChanged
    newGeojson.features = filterFeatures(newGeojson.features, event.data.tagsConfig)

    let featuresWayToPoint = wayToPoint(newGeojson);
    let styledGeojson =  setIconStyle(featuresWayToPoint, event.data.tagsConfig);

    let geojsonFinal = mergeOldNewGeojsonData(oldGeojson,styledGeojson,bbox_geojson,geojsonChanged );

    postMessage(geojsonFinal);
}

//ajout d'un listener
addEventListener("message", reponse, false);
