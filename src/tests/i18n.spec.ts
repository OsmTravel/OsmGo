import { globSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { TestBed } from '@angular/core/testing'
import {
    TranslateModule,
    TranslateService,
    type TranslationObject,
} from '@ngx-translate/core'
import { firstValueFrom } from 'rxjs'

type Translations = TranslationObject

const translationsDirectory = path.join(process.cwd(), 'src', 'assets', 'i18n')

function readTranslations(language: string): Translations {
    return JSON.parse(
        readFileSync(
            path.join(translationsDirectory, `${language}.json`),
            'utf8'
        )
    )
}

function listTranslationKeys(
    translations: Translations,
    prefix = ''
): string[] {
    const keys: string[] = []

    for (const [name, value] of Object.entries(translations)) {
        const key = prefix ? `${prefix}.${name}` : name
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...listTranslationKeys(value as Translations, key))
        } else {
            keys.push(key)
        }
    }

    return keys
}

describe('interface translations', () => {
    const english = readTranslations('en')
    const englishKeys = new Set(listTranslationKeys(english))

    it('keeps French interface keys aligned with English', () => {
        const frenchKeys = new Set(listTranslationKeys(readTranslations('fr')))

        expect([...englishKeys].filter((key) => !frenchKeys.has(key))).toEqual(
            []
        )
        expect([...frenchKeys].filter((key) => !englishKeys.has(key))).toEqual(
            []
        )
    })

    it('provides an English fallback for every translated key', () => {
        const translationFiles = readdirSync(translationsDirectory).filter(
            (fileName) => fileName.endsWith('.json') && fileName !== 'i18n.json'
        )
        const missingKeys: string[] = []

        for (const fileName of translationFiles) {
            const language = fileName.replace('.json', '')
            for (const key of listTranslationKeys(readTranslations(language))) {
                if (!englishKeys.has(key)) {
                    missingKeys.push(`${fileName}: ${key}`)
                }
            }
        }

        expect(missingKeys).toEqual([])
    })

    it('provides English text for every static interface key', () => {
        const knownSections = new Set(Object.keys(english))
        const sourceFiles = [
            ...globSync('src/app/**/*.ts'),
            ...globSync('src/app/**/*.html'),
        ].filter((fileName) => !fileName.endsWith('.spec.ts'))
        const missingKeys = new Set<string>()
        const translationKeyPattern = /[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)+/g

        for (const fileName of sourceFiles) {
            const source = readFileSync(fileName, 'utf8')
            for (const match of source.matchAll(translationKeyPattern)) {
                const key = match[0]
                const section = key.split('.')[0]
                if (knownSections.has(section) && !englishKeys.has(key)) {
                    missingKeys.add(key)
                }
            }
        }

        expect([...missingKeys].sort()).toEqual([])
    })

    it('uses English instead of exposing a raw key', async () => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot({ fallbackLang: 'en' })],
        })
        const translate = TestBed.inject(TranslateService)
        const key = 'MANAGE_TAGS.REMOVE_ALL_HIDDEN_TAGS'

        translate.setTranslation('en', english)
        translate.setTranslation('de', readTranslations('de'))
        await firstValueFrom(translate.use('de'))

        expect(translate.instant(key)).toBe('Remove all')
        expect(translate.instant(key)).not.toBe(key)
    })
})
