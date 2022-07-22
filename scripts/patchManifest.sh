#! /bin/bash
set -ex

USAGE="""\
Patch service worker webmanifest file to set a different scope and start_url to
work with a setup in which the application is not served from the root
directory.

This file is intended to be used after the npm build:ghpages script has
completed.
"""

WEBMANIFEST_PATH="www/manifest.webmanifest"
BASE_URL="/OsmGo/"  # trailing slash needed due to how GitHub Pages handles URLs

sed -i "s#\"scope\": \"/\"#\"scope\": \"${BASE_URL}\"#" "${WEBMANIFEST_PATH}"
sed -i "s#\"start_url\": \"/\"#\"start_url\": \"${BASE_URL}\"#" "${WEBMANIFEST_PATH}"
sed -i "s#\"id\": \"/\"#\"id\": \"${BASE_URL}\"#" "${WEBMANIFEST_PATH}"
