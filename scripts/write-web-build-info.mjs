import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [, , outputDirectoryArgument = 'www'] = process.argv
const repositoryDirectory = process.cwd()
const packageJson = JSON.parse(
    readFileSync(path.join(repositoryDirectory, 'package.json'), 'utf8')
)
const commit =
    process.env.OSMGO_BUILD_SHA ||
    execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repositoryDirectory,
        encoding: 'utf8',
    }).trim()

if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error('The web build commit must be a full Git SHA.')
}

const buildInfo = JSON.stringify({ version: packageJson.version, commit })
writeFileSync(
    path.resolve(outputDirectoryArgument, 'build-info.json'),
    `${buildInfo}\n`
)
