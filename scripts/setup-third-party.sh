#!/bin/bash

USAGE="""\
THis script checks if certain third-party repositories are set up at the same
root directory at which the OsmGo project is located.
It either clones the repositiries if they are not yet available or pulls the
latest content from upstream.
"""

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PARENT_DIR=$(realpath "$SCRIPT_DIR/../..")

URL_PROJECT_ID=https://github.com/openstreetmap/iD.git
URL_PROJECT_IDTS=https://github.com/openstreetmap/id-tagging-schema.git
URL_PROJECT_NSI=https://github.com/osmlab/name-suggestion-index.git

declare -A projects
projects["iD"]=$URL_PROJECT_ID
projects["id-tagging-schema"]=$URL_PROJECT_IDTS
projects["name-suggestion-index"]=$URL_PROJECT_NSI

cd "${PARENT_DIR}"

for name in ${!projects[@]}; do
    url="${projects[$name]}"
    if [ ! -d "${name}" ]; then
        # Project not found. Clone repository from upstream.
        git clone "${url}"
    else
        # Fetch latest content. Assume that default branch is checked out.
        cd "${name}"
        git pull
        cd -
    fi
done
