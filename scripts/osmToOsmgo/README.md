# OsmToOsmGo

Convert the JSON of OSM of API 0.6 to a geojson specially for Osm Go!.

It's like _osmtogeojson.js_ but faster and more readable.

It had usefull properties to the geojson features like :

- _usedByWays_ : if a node is used by a way
- _ndRef_ : The nodes that compose the ways
- time : the timestam in ms
- fixme : if he had a fixme tag

It can filter output data with the osmGo tagconfig and get the "primary key" & generate the icon name

It can merge the new data with the old geojson data (and bbox)

## Tests

```sh
npm run test:converter
```

The application and its web worker import this source directly. Angular bundles both
entry points during the regular application build.

## Notes

Files in the `fixture` folder are only used for tests.
