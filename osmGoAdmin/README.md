
### Interface permettant la gestion des tags et des presets ! 

cd backend 
npm install
npm start

cd frontend
npm install
npm start

=> http://localhost:4200/


## Generate taginfo like
node generateTagsStats.js --lang=fr-FR --path="/data/pbf/france-latest.osm.pbf"
node generateTagsStats.js --lang=de-DE --path="/data/pbf/germany-latest.osm.pbf"
node generateTagsStats.js --lang=en-GB --path="/data/pbf/great-britain-latest.osm.pbf"


