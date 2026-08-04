import {
    CATALOG_CACHE_SCHEMA_VERSION,
    requireCatalogCache,
    requirePresetCatalog,
    requireSpriteCatalog,
    requireTagsCatalog,
} from './catalog-validation'

const validTagCatalog = {
    primaryKeys: ['amenity'],
    tags: [
        {
            id: 'amenity/cafe',
            icon: 'maki-cafe',
            markerColor: '#123456',
            presets: ['name'],
            geometry: ['point', 'area'],
            tags: { amenity: 'cafe' },
        },
    ],
}

describe('catalog validation', () => {
    it('accepts structurally valid runtime catalogs', () => {
        const presets = {
            name: {
                key: 'name',
                type: 'text',
                lbl: { en: 'Name' },
            },
        }
        const sprites = {
            'maki-cafe': {
                x: 0,
                y: 12,
                width: 24,
                height: 24,
                pixelRatio: 1,
            },
        }

        expect(requireTagsCatalog(validTagCatalog)).toBe(validTagCatalog)
        expect(requirePresetCatalog(presets, 'presets')).toBe(presets)
        expect(requireSpriteCatalog(sprites)).toBe(sprites)
    })

    it.each([
        { ...validTagCatalog, primaryKeys: ['amenity', 'amenity'] },
        { ...validTagCatalog, tags: [{ ...validTagCatalog.tags[0], id: '' }] },
        {
            ...validTagCatalog,
            tags: [{ ...validTagCatalog.tags[0], markerColor: '#nothex' }],
        },
    ])('rejects malformed tag catalogs', (catalog) => {
        expect(() => requireTagsCatalog(catalog)).toThrow(
            'Invalid tags catalog.'
        )
    })

    it('rejects malformed presets and sprite coordinates', () => {
        expect(() =>
            requirePresetCatalog(
                { name: { key: 'name', type: 'text' } },
                'presets'
            )
        ).toThrow('Invalid presets catalog.')
        expect(() =>
            requireSpriteCatalog({
                broken: {
                    x: 0,
                    y: 0,
                    width: -1,
                    height: 24,
                    pixelRatio: 1,
                },
            })
        ).toThrow('Invalid sprites catalog.')
    })

    it('accepts only caches using the current schema version', () => {
        const cache = {
            schemaVersion: CATALOG_CACHE_SCHEMA_VERSION,
            value: validTagCatalog,
        }

        expect(requireCatalogCache(cache, requireTagsCatalog)).toEqual(cache)
        expect(() =>
            requireCatalogCache(
                { ...cache, schemaVersion: CATALOG_CACHE_SCHEMA_VERSION + 1 },
                requireTagsCatalog
            )
        ).toThrow('Invalid or outdated catalog cache.')
    })
})
