#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${REPOSITORY_DIR}/dist/android"
readonly IMAGE_NAME=osmgo-android-builder:local
readonly CONTAINER_KEYSTORE_PATH=/run/secrets/osmgo-release.keystore
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

readonly SIGNING_VARIABLES=(
    ANDROID_KEYSTORE_PATH
    ANDROID_KEYSTORE_PASSWORD
    ANDROID_KEY_ALIAS
    ANDROID_KEY_PASSWORD
)

missing_signing_variables=()
for variable_name in "${SIGNING_VARIABLES[@]}"; do
    if [[ -z "${!variable_name:-}" ]]; then
        missing_signing_variables+=("${variable_name}")
    fi
done

if [[ "${#missing_signing_variables[@]}" -ne 0 ]]; then
    echo "Android release signing requires: ${missing_signing_variables[*]}" >&2
    exit 1
fi

if [[ ! -f "${ANDROID_KEYSTORE_PATH}" || ! -r "${ANDROID_KEYSTORE_PATH}" ]]; then
    echo "ANDROID_KEYSTORE_PATH must point to a readable keystore file." >&2
    exit 1
fi

readonly HOST_KEYSTORE_PATH="$(realpath "${ANDROID_KEYSTORE_PATH}")"

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
    --env "ANDROID_KEYSTORE_PATH=${CONTAINER_KEYSTORE_PATH}" \
    --env ANDROID_KEYSTORE_PASSWORD \
    --env ANDROID_KEY_ALIAS \
    --env ANDROID_KEY_PASSWORD \
    --mount "type=bind,source=${REPOSITORY_DIR},target=/source,readonly" \
    --mount "type=bind,source=${HOST_KEYSTORE_PATH},target=${CONTAINER_KEYSTORE_PATH},readonly" \
    --mount "type=bind,source=${OUTPUT_DIR},target=/output" \
    "${IMAGE_NAME}"
