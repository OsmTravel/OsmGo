#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
    echo "Usage: $0 <artifact-directory> <certificate-sha256>" >&2
    exit 1
fi

readonly ARTIFACT_DIRECTORY="$(realpath "$1")"
readonly EXPECTED_CERT_SHA256="$(printf '%s' "$2" | tr -d ':' | tr '[:upper:]' '[:lower:]')"
readonly VERSION="$(node -p "require('./package.json').version")"
readonly VERSION_CODE="$(sed -n 's/^VERSION_CODE=//p' android/version.properties)"
readonly TARGET_SDK="$(sed -n 's/.*targetSdkVersion = \([0-9]*\).*/\1/p' android/variables.gradle)"
readonly APK_PATH="${ARTIFACT_DIRECTORY}/osmgo-${VERSION}.apk"
readonly AAB_PATH="${ARTIFACT_DIRECTORY}/osmgo-${VERSION}.aab"

fail() {
    echo "Android artifact verification failed: $1" >&2
    exit 1
}

if [[ ! "${EXPECTED_CERT_SHA256}" =~ ^[0-9a-f]{64}$ ]]; then
    fail 'the expected certificate SHA-256 fingerprint is invalid.'
fi

node scripts/verify-android-build-info.mjs "${ARTIFACT_DIRECTORY}" || \
    fail 'the artifact metadata or checksums are invalid.'
(
    cd "${ARTIFACT_DIRECTORY}"
    sha256sum --check SHA256SUMS >/dev/null
) || fail 'SHA256SUMS rejected an artifact.'

readonly APK_BADGING="$(aapt dump badging "${APK_PATH}")"
[[ "${APK_BADGING}" == *"package: name='fr.dogeo.osmgo' versionCode='${VERSION_CODE}' versionName='${VERSION}'"* ]] || \
    fail 'the APK package or version is invalid.'
[[ "${APK_BADGING}" == *"targetSdkVersion:'${TARGET_SDK}'"* ]] || \
    fail 'the APK target SDK is invalid.'
zipalign -c -P 16 4 "${APK_PATH}" >/dev/null || \
    fail 'the APK is not correctly aligned.'

readonly APK_SIGNATURE="$(apksigner verify --verbose --print-certs "${APK_PATH}")"
readonly APK_CERT_SHA256="$(
    printf '%s\n' "${APK_SIGNATURE}" \
        | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
        | head -1
)"
[[ "${APK_CERT_SHA256}" == "${EXPECTED_CERT_SHA256}" ]] || \
    fail 'the APK certificate does not match the expected signing key.'

java -jar "${BUNDLETOOL_JAR}" validate --bundle "${AAB_PATH}" >/dev/null || \
    fail 'Bundletool rejected the AAB.'
readonly AAB_MANIFEST="$(
    java -jar "${BUNDLETOOL_JAR}" dump manifest \
        --bundle "${AAB_PATH}" \
        --module base
)"
[[ "${AAB_MANIFEST}" == *"android:versionCode=\"${VERSION_CODE}\""* ]] || \
    fail 'the AAB version code is invalid.'
[[ "${AAB_MANIFEST}" == *"android:versionName=\"${VERSION}\""* ]] || \
    fail 'the AAB version name is invalid.'
[[ "${AAB_MANIFEST}" == *"package=\"fr.dogeo.osmgo\""* ]] || \
    fail 'the AAB package is invalid.'
[[ "${AAB_MANIFEST}" == *"android:targetSdkVersion=\"${TARGET_SDK}\""* ]] || \
    fail 'the AAB target SDK is invalid.'

readonly JARSIGNER_OUTPUT="$(jarsigner -verify "${AAB_PATH}" 2>&1)"
[[ "${JARSIGNER_OUTPUT}" == *'jar verified.'* ]] || \
    fail 'jarsigner rejected the AAB.'
readonly AAB_CERT_SHA256="$(
    keytool -printcert -jarfile "${AAB_PATH}" \
        | sed -n 's/^[[:space:]]*SHA256: //p' \
        | head -1 \
        | tr -d ':' \
        | tr '[:upper:]' '[:lower:]'
)"
[[ "${AAB_CERT_SHA256}" == "${EXPECTED_CERT_SHA256}" ]] || \
    fail 'the AAB certificate does not match the expected signing key.'

echo "Android artifacts verified."
