#!/usr/bin/env bash

set -euo pipefail

readonly SOURCE_DIR=/source
readonly OUTPUT_DIR=/output
readonly WORK_DIR="$(mktemp --directory /tmp/osmgo-build.XXXXXX)"

cleanup() {
    rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

mkdir -p "${HOME}" "${OUTPUT_DIR}"

tar \
    --create \
    --file - \
    --directory "${SOURCE_DIR}" \
    --exclude=.git \
    --exclude=.github \
    --exclude=.angular \
    --exclude=.gradle \
    --exclude=.env.android-signing \
    --exclude='*.jks' \
    --exclude='*.jks.*' \
    --exclude='*.keystore' \
    --exclude='*.keystore.*' \
    --exclude=android/app/release \
    --exclude=build \
    --exclude=coverage \
    --exclude=dist \
    --exclude=keystore.properties \
    --exclude=node_modules \
    --exclude=wFabien \
    --exclude=www \
    . | tar --extract --file - --directory "${WORK_DIR}"

cd "${WORK_DIR}"

export HUSKY=0

npm ci
npm run check
npm run test:ci
npm run test:converter
npm run android:prepare
./android/gradlew -p android --no-daemon \
    clean \
    testReleaseUnitTest \
    lintRelease \
    assembleRelease \
    bundleRelease

readonly APK_PATH="$(find android/app/build/outputs/apk/release -type f -name '*.apk' -print -quit)"
readonly AAB_PATH="$(find android/app/build/outputs/bundle/release -type f -name '*.aab' -print -quit)"

if [[ -z "${APK_PATH}" || -z "${AAB_PATH}" ]]; then
    echo "The Android build did not produce both an APK and an AAB." >&2
    exit 1
fi

readonly EXPECTED_CERT_SHA256="$(
    keytool \
        -list \
        -v \
        -keystore "${ANDROID_KEYSTORE_PATH}" \
        -storepass:env ANDROID_KEYSTORE_PASSWORD \
        -alias "${ANDROID_KEY_ALIAS}" \
        | sed -n 's/^[[:space:]]*SHA256: //p' \
        | head -1 \
        | tr -d ':' \
        | tr '[:upper:]' '[:lower:]'
)"

node scripts/package-android-artifacts.mjs \
    "${APK_PATH}" \
    "${AAB_PATH}" \
    "${OUTPUT_DIR}"
scripts/test-android-artifact-verifier.sh \
    "${OUTPUT_DIR}" \
    "${EXPECTED_CERT_SHA256}"
