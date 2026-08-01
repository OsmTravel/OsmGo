import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [, , outputDirectoryArgument] = process.argv
if (!outputDirectoryArgument) {
    throw new Error(
        'Usage: node scripts/verify-android-build-info.mjs <output-directory>'
    )
}

function fail(message) {
    throw new Error(`Android artifact metadata is invalid: ${message}`)
}

function readInteger(filePath, pattern, name) {
    const match = readFileSync(filePath, 'utf8').match(pattern)
    if (!match) fail(`could not read ${name}`)
    return Number(match[1])
}

function sha256(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

const repositoryDirectory = process.cwd()
const outputDirectory = path.resolve(outputDirectoryArgument)
const version = JSON.parse(
    readFileSync(path.join(repositoryDirectory, 'package.json'), 'utf8')
).version
const versionCode = readInteger(
    path.join(repositoryDirectory, 'android/version.properties'),
    /^VERSION_CODE=(\d+)$/m,
    'VERSION_CODE'
)
const targetSdk = readInteger(
    path.join(repositoryDirectory, 'android/variables.gradle'),
    /targetSdkVersion\s*=\s*(\d+)/,
    'targetSdkVersion'
)
const apkName = `osmgo-${version}.apk`
const aabName = `osmgo-${version}.aab`
const expectedFiles = ['SHA256SUMS', 'build-info.json', aabName, apkName].sort()
const actualFiles = readdirSync(outputDirectory).sort()

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    fail(`expected only ${expectedFiles.join(', ')}`)
}

const hashes = {
    [apkName]: sha256(path.join(outputDirectory, apkName)),
    [aabName]: sha256(path.join(outputDirectory, aabName)),
}
const buildInfo = JSON.parse(
    readFileSync(path.join(outputDirectory, 'build-info.json'), 'utf8')
)
const expectedKeys = [
    'commit',
    'date',
    'sha256',
    'targetSdk',
    'version',
    'versionCode',
]

if (
    JSON.stringify(Object.keys(buildInfo).sort()) !==
    JSON.stringify(expectedKeys)
) {
    fail('build-info.json contains unexpected fields')
}
if (
    buildInfo.version !== version ||
    buildInfo.versionCode !== versionCode ||
    buildInfo.commit !== process.env.OSMGO_BUILD_SHA ||
    buildInfo.date !== process.env.OSMGO_BUILD_DATE ||
    buildInfo.targetSdk !== targetSdk ||
    JSON.stringify(buildInfo.sha256) !== JSON.stringify(hashes)
) {
    fail('build-info.json does not match the artifacts or build inputs')
}

const expectedChecksums = Object.entries(hashes)
    .map(([fileName, hash]) => `${hash}  ${fileName}`)
    .join('\n')
const actualChecksums = readFileSync(
    path.join(outputDirectory, 'SHA256SUMS'),
    'utf8'
).trim()
if (actualChecksums !== expectedChecksums) {
    fail('SHA256SUMS does not match the artifacts')
}
