#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
    echo "Usage: $0 <artifact-directory> <certificate-sha256>" >&2
    exit 1
fi

readonly ARTIFACT_DIRECTORY="$(realpath "$1")"
readonly EXPECTED_CERT_SHA256="$2"
readonly VERSION="$(node -p "require('./package.json').version")"
readonly TEST_ROOT="$(mktemp --directory /tmp/osmgo-artifacts.XXXXXX)"
readonly TEST_DIRECTORY="${TEST_ROOT}/artifacts"
readonly TEST_LOG="${TEST_ROOT}/verification.log"

cleanup() {
    find "${TEST_ROOT}" -type f -delete
    find "${TEST_ROOT}" -depth -type d -empty -delete
}
trap cleanup EXIT

mkdir "${TEST_DIRECTORY}"

scripts/verify-android-artifacts.sh \
    "${ARTIFACT_DIRECTORY}" \
    "${EXPECTED_CERT_SHA256}"

cp "${ARTIFACT_DIRECTORY}"/* "${TEST_DIRECTORY}/"
truncate --size 32 "${TEST_DIRECTORY}/osmgo-${VERSION}.apk"
if scripts/verify-android-artifacts.sh \
    "${TEST_DIRECTORY}" \
    "${EXPECTED_CERT_SHA256}" >"${TEST_LOG}" 2>&1; then
    echo 'The verifier accepted a corrupted APK.' >&2
    exit 1
fi
grep -Fq 'artifact metadata or checksums are invalid' "${TEST_LOG}"

cp "${ARTIFACT_DIRECTORY}/osmgo-${VERSION}.apk" "${TEST_DIRECTORY}/"
wrong_cert_prefix=0
if [[ "${EXPECTED_CERT_SHA256:0:1}" == 0 ]]; then
    wrong_cert_prefix=1
fi
readonly WRONG_CERT_SHA256="${wrong_cert_prefix}${EXPECTED_CERT_SHA256:1}"
if scripts/verify-android-artifacts.sh \
    "${TEST_DIRECTORY}" \
    "${WRONG_CERT_SHA256}" >"${TEST_LOG}" 2>&1; then
    echo 'The verifier accepted an APK signed by the wrong key.' >&2
    exit 1
fi
grep -Fq 'certificate does not match the expected signing key' "${TEST_LOG}"

echo 'Negative Android artifact verification tests passed.'
