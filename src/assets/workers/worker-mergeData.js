importScripts('../lib/turf.min.js');

    function getMergedGeojsonGeojsonChanged(geojson,geojsonChanged) {
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
        // // ADD to geojson
        // for (let i = 0; i < geojsonChanged.features.length; i++) {
        //     geojson.features.push(geojsonChanged.features[i]);
        // }
        return JSON.parse(JSON.stringify(geojson))
    }

function reponse(event){
      //postMessage(event.data);
      let oldGeojson = event.data.oldGeojson;
      let newGeojson = event.data.newGeojson;
      let bbox_geojson = event.data.bbox_geojson;
      let geojsonChanged = event.data.geojsonChanged;
      let tags = event.data.tags;
      let geojson = null;
      let oldFeatures = oldGeojson.features;
      let newFeatures = newGeojson.features;

  
        
        if (oldFeatures.length == 0) {
          //postMessage(newGeojson);
          geojson = newGeojson;
        } 
        
        else{
          //  le cas où une feature a été supprimé entre temps, on doit la supprimer de nos données:
            let id_features_deleted = [];
            for (let i = 0; i < oldFeatures.length; i++) { // si la feature est dans la BBOX, on la push pour la supprimer
             // console.log(turf.inside(oldFeatures[i], bbox_geojson));
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
        //postMessage(oldGeojson);
        }
        postMessage(getMergedGeojsonGeojsonChanged(geojson,geojsonChanged));
}

//ajout d'un listener
addEventListener("message",reponse,false);
