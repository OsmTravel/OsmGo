# OsmToOsmGo

Convert the JSON of OSM of API 0.6 to a geojson specially for Osm Go!.

It's like _osmtogeojson.js_ but faster and more readable.

It had usefull properties to the geojson features like :

-   _usedByWays_ : if a node is used by a way
-   _ndRef_ : The nodes that compose the ways
-   time : the timestam in ms
-   fixme : if he had a fixme tag

It can filter output data with the osmGo tagconfig and get the "primary key" & generate the icon name

It can merge the new data with the old geojson data (and bbox)

## Build with rollup

```sh
npm i
npm run build
```

Create index.min.js in this folder (cjs) and src/assets/osmToOsmgo.min.js (iife)

## Notes

Files in folder "fixture" are only used for tests, so no need to update them.
