# Updating Osm Go! assets

Install the pinned npm dependencies before running an importer:

```sh
npm ci
```

The preset generator reads the exact iD Tagging Schema and Name Suggestion Index packages from `node_modules`. It does not require adjacent source checkouts.

```sh
npm run presets:generate
npm run test:scripts
```

The complete asset update also regenerates sprites and downloads the current basemap index:

```sh
npm run update
```

The basemap and Taginfo importers use external HTTP sources. Run them only with network access and review their generated diff before committing it.

```sh
npm run importBaseMaps
npm run importDescriptions
```

Commit all changed files under `src/assets/tagsAndPresets` and `src/assets/mapStyle/sprites`. CI verifies that preset generation is deterministic and that its output is committed.
