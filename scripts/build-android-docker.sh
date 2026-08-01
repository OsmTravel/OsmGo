#!/usr/bin/env bash

set -euo pipefail

readonly REPOSITORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly OUTPUT_DIR="${REPOSITORY_DIR}/dist/android"
readonly IMAGE_NAME=osmgo-android-builder:local
readonly CONTAINER_KEYSTORE_PATH=/run/secrets/osmgo-release.keystore
readonly BUILD_BRANCH="$(git -C "${REPOSITORY_DIR}" rev-parse --abbrev-ref HEAD)"
readonly BUILD_DATE="$(git -C "${REPOSITORY_DIR}" show -s --format=%cI HEAD)"
readonly BUILD_SHA="$(git -C "${REPOSITORY_DIR}" rev-parse HEAD)"
readonly WORKTREE_STATE_BEFORE="$(git -C "${REPOSITORY_DIR}" status --porcelain=v1 --untracked-files=all)"

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

readonly WORKTREE_STATE_AFTER="$(git -C "${REPOSITORY_DIR}" status --porcelain=v1 --untracked-files=all)"
if [[ "${WORKTREE_STATE_AFTER}" != "${WORKTREE_STATE_BEFORE}" ]]; then
    echo "The Android build changed the repository worktree." >&2
    exit 1
fi

readonly IMAGE_METADATA="$(
    docker image inspect "${IMAGE_NAME}"
    docker history --no-trunc --format '{{.CreatedBy}}' "${IMAGE_NAME}"
)"
for variable_name in \
    ANDROID_KEYSTORE_PATH \
    ANDROID_KEYSTORE_PASSWORD \
    ANDROID_KEY_ALIAS \
    ANDROID_KEY_PASSWORD; do
    if [[ "${IMAGE_METADATA}" == *"${variable_name}"* ]]; then
        echo "Android signing material was found in the Docker image metadata." >&2
        exit 1
    fi
done

for variable_name in ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD; do
    variable_value="${!variable_name}"
    if [[ "${#variable_value}" -ge 8 && "${IMAGE_METADATA}" == *"${variable_value}"* ]]; then
        echo "Android signing material was found in the Docker image metadata." >&2
        exit 1
    fi
done
