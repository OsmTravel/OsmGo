import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { rootDir } from './_paths'

interface ServiceWorkerConfig {
    assetGroups: Array<{
        name: string
        resources: { files?: string[] }
    }>
    dataGroups?: Array<{
        name: string
        cacheConfig: {
            strategy: string
            maxSize: number
            maxAge: string
        }
    }>
}

interface GeneratedManifest {
    hashTable: Record<string, string>
}

const outputDirectory = path.join(rootDir, 'www')
const configPath = path.join(rootDir, 'ngsw-config.json')
const generatedManifestPath = path.join(outputDirectory, 'ngsw.json')
const config = JSON.parse(
    fs.readFileSync(configPath, 'utf8')
) as ServiceWorkerConfig
const generatedManifest = JSON.parse(
    fs.readFileSync(generatedManifestPath, 'utf8')
) as GeneratedManifest
const configSource = fs.readFileSync(configPath, 'utf8')

for (const stalePath of ['/assets/osmtogeojson.js', '/svg/md-']) {
    assert.ok(
        !configSource.includes(stalePath),
        `Stale service-worker path remains: ${stalePath}`
    )
}

const hasGlob = (filePath: string): boolean => /[*?!]/.test(filePath)
for (const group of config.assetGroups) {
    for (const filePath of group.resources.files ?? []) {
        if (hasGlob(filePath)) continue
        assert.ok(
            fs.existsSync(path.join(outputDirectory, filePath)),
            `${group.name} references missing build output ${filePath}`
        )
    }
}

for (const filePath of Object.keys(generatedManifest.hashTable)) {
    assert.ok(
        fs.existsSync(path.join(outputDirectory, filePath)),
        `Generated service-worker manifest references missing ${filePath}`
    )
}

const assetFiles = config.assetGroups.find((group) => group.name === 'assets')
    ?.resources.files
assert.ok(assetFiles?.includes('/assets/**'), 'Assets must use one broad glob')

const tilePolicy = config.dataGroups?.find(
    (group) => group.name === 'map-tiles-previously-viewed'
)
assert.deepEqual(tilePolicy?.cacheConfig, {
    maxSize: 800,
    maxAge: '15d',
    strategy: 'performance',
})

console.log(
    `PWA build valid: ${Object.keys(generatedManifest.hashTable).length} hashed files and an explicit previously-viewed tile policy.`
)
