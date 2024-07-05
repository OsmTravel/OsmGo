/*
  remove empty translation from i18n files
*/

import { readdirSync, write, writeFileSync } from 'fs'
import { readJsonSync } from 'fs-extra'
import path from 'path'

function removeEmptyProperties(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            // Récursivement traiter les objets imbriqués
            removeEmptyProperties(obj[key])
            if (Object.keys(obj[key]).length === 0) {
                delete obj[key]
            }
        } else if (obj[key] === '') {
            delete obj[key]
        }
    }
    return obj
}

const pathI8n = path.join(__dirname, '..', 'src', 'assets', 'i18n')

let files = readdirSync(pathI8n)
files = files.filter((file) => file !== 'i18n.json')

// parcours des fichiers
files.forEach((file) => {
    const filePath = path.resolve(pathI8n, file)
    const translations = readJsonSync(filePath, 'utf8')
    const translationsWithoutEmptyString = removeEmptyProperties(translations)
    const json = JSON.stringify(translationsWithoutEmptyString, null, 4)
    if (json) {
        writeFileSync(filePath, json, 'utf8')
    }
})
