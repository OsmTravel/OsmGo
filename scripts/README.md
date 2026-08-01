## Updating OsmGo assets

OsmGo assets will do imports from:

- [iD]
- [id-tagging-schema].

Name Suggestion Index data comes from the exact version installed by npm.

### 0. Quick setup

To setup all required repos in a single step, use the [`setup-third-party.sh`](./setup-third-party.sh) shell script.

Alternatively you can follow steps I and II to clone the repositories individually.
**Please note that the default name of the respoitories (= the folder name into which the code is cloned) should not be changed as they are hard-coded in the scripts.**

### I. Clone iD

The repo of iD must be at same root as OsmGo repo

`git clone https://github.com/openstreetmap/iD.git`

### II. Clone id-tagging-schema

The repo of id-tagging-schema must be at same root as OsmGo repo

`git clone https://github.com/openstreetmap/id-tagging-schema.git`

### III. Import translation from iD

`tsx --tsconfig ./tsconfig.json addTranslationFromiD.ts`

### IV. Import description from taginfo

`tsx --tsconfig ./tsconfig.json importDescriptionFromTaginfo.ts --overwrite`

[id]: https://github.com/openstreetmap/iD
[id-tagging-schema]: https://github.com/openstreetmap/id-tagging-schema
