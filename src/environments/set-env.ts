import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import git from 'git-last-commit'

const gitPath = path.join(__dirname, '..', '..')
const envPath = path.join(__dirname, 'environment.prod.ts')

type BuildMetadata = {
    branch: string
    shortHash: string
    date: string
}

const getGitMetadata = (): Promise<BuildMetadata> => {
    return new Promise((resolve, reject) => {
        git.getLastCommit(
            (err, commit: any) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve({
                    branch: commit.branch,
                    shortHash: commit.shortHash,
                    date: new Date(commit.committedOn * 1000).toISOString(),
                })
            },
            { dst: gitPath }
        )
    })
}

const getBuildMetadata = async (): Promise<BuildMetadata> => {
    const branch = process.env.OSMGO_BUILD_BRANCH
    const sha = process.env.OSMGO_BUILD_SHA
    const date = process.env.OSMGO_BUILD_DATE

    if (branch && sha && date) {
        return { branch, shortHash: sha.slice(0, 7), date }
    }

    const gitMetadata = await getGitMetadata()
    return {
        branch: branch || gitMetadata.branch,
        shortHash: sha ? sha.slice(0, 7) : gitMetadata.shortHash,
        date: date || gitMetadata.date,
    }
}

const asSourceValue = (value: string | undefined): string => {
    return value === undefined ? 'undefined' : JSON.stringify(value)
}

const setEnv = async (): Promise<void> => {
    const buildMetadata = await getBuildMetadata()
    const packageJson = JSON.parse(
        readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    )
    const version = packageJson.version

    let platform = process.argv[process.argv.length - 1]
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

setEnv().catch((error) => {
    console.error('Unable to create the production environment file.', error)
    process.exitCode = 1
})
