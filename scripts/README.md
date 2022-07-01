## Updating OsmGo assets

OsmGo assets willdo imports from:

-   iD
-   id-tagging-schema
-   and name-suggestion-index.

### I. Clone iD

The repo of iD must be at same root as OsmGo repo

`git clone https://github.com/openstreetmap/iD.git`

### II. Clone id-tagging-schema

The repo of id-tagging-schema must be at same root as OsmGo repo

`git clone https://github.com/openstreetmap/id-tagging-schema.git`

### III. Clone name-suggestion-index

The repo of name-suggestion-index must be at same root as OsmGo repo

`git clone https://github.com/osmlab/name-suggestion-index.git`

### IV. Import translation from iD

`node addTranslationFromiD.js`

### V. Import description from taginfo

`node importDescriptionFromTaginfo.js o`

Options:

-   o => owerwrite
