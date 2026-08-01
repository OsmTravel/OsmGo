import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

const gitPath = path.join(__dirname, '..', '..')
const envPath = path.join(__dirname, 'environment.prod.ts')

type BuildMetadata = {
    branch: string
    shortHash: string
    date: string
}

const runGit = (args: string[]): string => {
    return execFileSync('git', args, {
        cwd: gitPath,
        encoding: 'utf8',
    }).trim()
}

const getGitMetadata = (): BuildMetadata => {
    return {
        branch: runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
        shortHash: runGit(['rev-parse', '--short=7', 'HEAD']),
        date: new Date(
            Number(runGit(['show', '-s', '--format=%ct', 'HEAD'])) * 1000
        ).toISOString(),
    }
}

const getBuildMetadata = (): BuildMetadata => {
    const branch = process.env.OSMGO_BUILD_BRANCH
    const sha = process.env.OSMGO_BUILD_SHA
    const date = process.env.OSMGO_BUILD_DATE

    if (branch && sha && date) {
        return { branch, shortHash: sha.slice(0, 7), date }
    }

    const gitMetadata = getGitMetadata()
    return {
        branch: branch || gitMetadata.branch,
        shortHash: sha ? sha.slice(0, 7) : gitMetadata.shortHash,
        date: date || gitMetadata.date,
    }
}

const asSourceValue = (value: string | undefined): string => {
    return value === undefined ? 'undefined' : JSON.stringify(value)
}

const setEnv = (): void => {
    const buildMetadata = getBuildMetadata()
    const packageJson = JSON.parse(
        readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    )
    const version = packageJson.version

    let platform: string | undefined = process.argv[process.argv.length - 1]
    if (!['Android', 'PWA'].includes(platform)) {
        platform = undefined
    }

    const environmentContent = `export const environment = {
    production: true,
    version: ${asSourceValue(version)},
    branch: ${asSourceValue(buildMetadata.branch)},
    shortHash: ${asSourceValue(buildMetadata.shortHash)},
    date: ${asSourceValue(buildMetadata.date)},
    platform: ${asSourceValue(platform)}
}
`
    writeFileSync(envPath, environmentContent)
}

try {
    setEnv()
} catch (error) {
    console.error('Unable to create the production environment file.', error)
    process.exitCode = 1
}
