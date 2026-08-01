import { createHash } from 'node:crypto'
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs'
import path from 'node:path'

const [, , sourceApk, sourceAab, outputDirectoryArgument] = process.argv

if (!sourceApk || !sourceAab || !outputDirectoryArgument) {
    throw new Error(
        'Usage: node scripts/package-android-artifacts.mjs <apk> <aab> <output-directory>'
    )
}

function readInteger(filePath, pattern, name) {
    const match = readFileSync(filePath, 'utf8').match(pattern)
    if (!match) throw new Error(`Could not read ${name} from ${filePath}.`)
    return Number(match[1])
}

function sha256(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

for (const sourceFile of [sourceApk, sourceAab]) {
    if (!existsSync(sourceFile) || statSync(sourceFile).size === 0) {
        throw new Error(
            `Android build output is missing or empty: ${sourceFile}`
        )
    }
}

const repositoryDirectory = process.cwd()
const outputDirectory = path.resolve(outputDirectoryArgument)
const packageJson = JSON.parse(
    readFileSync(path.join(repositoryDirectory, 'package.json'), 'utf8')
)
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
const commit = process.env.OSMGO_BUILD_SHA
const date = process.env.OSMGO_BUILD_DATE

if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
    throw new Error('OSMGO_BUILD_SHA must be a full Git commit SHA.')
}
if (!date || Number.isNaN(Date.parse(date))) {
    throw new Error('OSMGO_BUILD_DATE must be an ISO 8601 date.')
}

mkdirSync(outputDirectory, { recursive: true })
for (const fileName of readdirSync(outputDirectory)) {
    if (
        /^osmgo-.*\.(apk|aab)$/.test(fileName) ||
        [
            'app-release.aab',
            'app-release.apk',
            'app-release-unsigned.apk',
            'SHA256SUMS',
            'build-info.json',
        ].includes(fileName)
    ) {
        unlinkSync(path.join(outputDirectory, fileName))
    }
}

const apkName = `osmgo-${packageJson.version}.apk`
const aabName = `osmgo-${packageJson.version}.aab`
const apkPath = path.join(outputDirectory, apkName)
const aabPath = path.join(outputDirectory, aabName)

copyFileSync(sourceApk, apkPath)
copyFileSync(sourceAab, aabPath)

const hashes = {
    [apkName]: sha256(apkPath),
    [aabName]: sha256(aabPath),
}
const checksumLines = Object.entries(hashes).map(
    ([fileName, hash]) => `${hash}  ${fileName}`
)
writeFileSync(
    path.join(outputDirectory, 'SHA256SUMS'),
    `${checksumLines.join('\n')}\n`
)

const buildInfo = {
    version: packageJson.version,
    versionCode,
    commit,
    date,
    targetSdk,
    sha256: hashes,
}
writeFileSync(
    path.join(outputDirectory, 'build-info.json'),
    `${JSON.stringify(buildInfo, null, 2)}\n`
)
