// const { writeFile } = require('fs');
import path from 'path'
import git from 'git-last-commit'
import { readFileSync, write, writeFileSync } from 'fs'

const gitPath = path.join(__dirname, '..', '..')

const envPath = path.join(__dirname, 'environment.prod.ts')

const getLastCommit = () => {
    return new Promise((resolve, reject) => {
        git.getLastCommit(
            (err, commit: any) => {
                if (err) {
                    reject(err)
                }
                const info = {
                    ...commit,
                    date: new Date(commit.committedOn * 1000).toISOString(),
                }
                resolve(info)
            },
            { dst: gitPath }
        )
    })
}

const setEnv = async () => {
    const gitInfo: any = await getLastCommit()

    const packagejson = JSON.parse(
        readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    )
    const vesion = packagejson.version

    let platform = process.argv[process.argv.length - 1]
    if (!['Android', 'PWA'].includes(platform)) {
        platform = undefined
    }

    const environmentContent = `export const environment = {
    production: true,
    version: '${vesion}',
    branch: '${gitInfo.branch}',
    shortHash: '${gitInfo.shortHash}',
    date: '${gitInfo.date}',
    platform: '${platform}'
}
`
    writeFileSync(envPath, environmentContent)
}

setEnv()
