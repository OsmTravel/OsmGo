#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${REPOSITORY_DIR}/dist/android"
readonly IMAGE_NAME=osmgo-android-builder:local
readonly BUILD_BRANCH="$(git -C "${REPOSITORY_DIR}" rev-parse --abbrev-ref HEAD)"
readonly BUILD_DATE="$(git -C "${REPOSITORY_DIR}" show -s --format=%cI HEAD)"
readonly BUILD_SHA="$(git -C "${REPOSITORY_DIR}" rev-parse HEAD)"

build_options=()
if [[ "${1:-}" == "--no-cache" ]]; then
    build_options+=(--no-cache)
    shift
fi

if [[ "$#" -ne 0 ]]; then
    echo "Usage: $0 [--no-cache]" >&2
    exit 1
fi

mkdir -p "${OUTPUT_DIR}"

docker build \
    "${build_options[@]}" \
    --file "${REPOSITORY_DIR}/docker/android/Dockerfile" \
    --tag "${IMAGE_NAME}" \
    "${REPOSITORY_DIR}"

docker run --rm \
    --user "$(id -u):$(id -g)" \
    --env HOME=/tmp/home \
    --env "OSMGO_BUILD_BRANCH=${BUILD_BRANCH}" \
    --env "OSMGO_BUILD_DATE=${BUILD_DATE}" \
    --env "OSMGO_BUILD_SHA=${BUILD_SHA}" \
    --mount "type=bind,source=${REPOSITORY_DIR},target=/source,readonly" \
    --mount "type=bind,source=${OUTPUT_DIR},target=/output" \
    "${IMAGE_NAME}"
