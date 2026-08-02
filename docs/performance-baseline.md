# Runtime performance baseline

Measured with `npm run build` on 2026-08-02, before and after the targeted
runtime import cleanup:

| Metric                                 |    Before |     After |
| -------------------------------------- | --------: | --------: |
| Initial bundle, raw                    | 575.84 kB | 575.91 kB |
| Initial bundle, estimated transfer     | 112.59 kB | 112.42 kB |
| Largest lazy chunk, raw                |   1.08 MB |   1.01 MB |
| Largest lazy chunk, estimated transfer | 240.37 kB | 216.87 kB |
| Angular CommonJS warnings              |        13 |         6 |
| Presets fetched at startup             |    8.8 MB |    2.7 MB |

The 5.8 MB brand catalog is loaded only when an object editor needs a brand
field. The 3.0 MB imagery index is loaded only on the basemap page and reused
for subsequent coordinate queries. `TagsService.catalogMetrics` records
download, JSON parse and tag-index durations independently in the browser.

Progressive release budgets are 750 kB for the initial application bundle,
8 MB for tags, 3 MB for base presets, 6.5 MB for brands and 3.5 MB for imagery.
The remaining approved CommonJS warnings are LocalForage and the five legacy
YoHours modules; replacing either requires an isolated compatibility change.
