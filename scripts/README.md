## Updating OsmGo assets

OsmGo assets will do imports from:

-   [iD]
-   [id-tagging-schema]
-   and [name-suggestion-index].

### 0. Quick setup

To setup all required repos in a single step, use the [`setup-third-party.sh`](./setup-third-party.sh) shell script.

Alternatively you can follow steps (I - III) to clone the repositories individually.
**Please note that the default name of the respoitories (= the folder name into which the code is cloned) should not be changed as they are hard-coded in the scripts.**

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

`ts-node addTranslationFromiD.ts`

### V. Import description from taginfo

`ts-node importDescriptionFromTaginfo.ts --overwrite`

[id]: https://github.com/openstreetmap/iD
[id-tagging-schema]: https://github.com/openstreetmap/id-tagging-schema
[name-suggestion-index]: https://github.com/osmlab/name-suggestion-index
