import assert from 'node:assert/strict'
import { getBrandOptions } from './nameSuggestionIndex'

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
    pharmacyBrands.every((brand) => typeof brand.v === 'string'),
    'Every imported option should be a brand'
)

console.log('Name Suggestion Index tests passed')
