import assert from 'node:assert/strict'
import {
    getBrandOptions,
    mergeBrandOptionsByValue,
} from './nameSuggestionIndex'

const brandOptions = getBrandOptions()
const pharmacyBrands = brandOptions['amenity/pharmacy']
const bePharmacy = pharmacyBrands.find((brand) => brand.v === 'Be')

assert.ok(bePharmacy, 'The Be pharmacy brand should be imported')
assert.deepEqual(
    bePharmacy.countryCodes,
    ['il'],
    'The Be pharmacy brand should be available in Israel'
)
assert.ok(
    Object.values(brandOptions).every((options) => {
        const values = options.map((option) => option.v)
        return (
            values.every((value) => typeof value === 'string') &&
            new Set(values).size === values.length
        )
    }),
    'Every imported brand list should contain unique string values'
)

const mergedConflict = mergeBrandOptionsByValue([
    {
        name: 'Example France',
        v: 'Example',
        lbl: { en: 'Example France' },
        countryCodes: ['fr'],
        locationSet: { include: ['fr'] },
        tags: { shop: 'books', 'brand:wikidata': 'Q1' },
        addTags: { brand: 'Example', 'brand:wikidata': 'Q1' },
    },
    {
        name: 'Example Belgium',
        v: 'Example',
        lbl: { en: 'Example Belgium' },
        countryCodes: ['be'],
        locationSet: { include: ['be'] },
        tags: { shop: 'books', 'brand:wikidata': 'Q2' },
        addTags: { brand: 'Example', 'brand:wikidata': 'Q2' },
    },
])

assert.deepEqual(mergedConflict[0].countryCodes, ['be', 'fr'])
assert.deepEqual(mergedConflict[0].tags, { shop: 'books' })
assert.deepEqual(mergedConflict[0].addTags, { brand: 'Example' })

console.log('Name Suggestion Index tests passed')
