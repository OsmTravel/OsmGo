import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { rootDir, tapPresetsPath, tapTagsPath } from './_paths'

const generatePresets = (): Array<string> => {
    execFileSync('npm', ['run', 'presets:generate'], {
        cwd: rootDir,
        stdio: 'pipe',
    })

    return [tapTagsPath, tapPresetsPath].map((filePath) => {
        return createHash('sha256')
            .update(fs.readFileSync(filePath))
            .digest('hex')
    })
}

const firstGeneration = generatePresets()
const secondGeneration = generatePresets()

assert.deepEqual(
    secondGeneration,
    firstGeneration,
    'Preset generation should be deterministic'
)

console.log('Preset generation tests passed')
