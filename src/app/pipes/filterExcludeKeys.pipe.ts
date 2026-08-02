import { Pipe } from '@angular/core'
import type { Preset, Tag, TagConfig } from '@osmgo/type'

interface CountrySpecificPreset extends Preset {
    countryCode?: string[]
}

@Pipe({
    name: 'filterExcludeKeys',
    pure: false,
})
export class FilterExcludeKeysPipe {
    transform(
        items: Tag[],
        tagConfig: TagConfig | null | undefined,
        countryCode: string,
        primaryKeys: string[],
        presets: Record<string, CountrySpecificPreset> | null | undefined,
        excludeOtherPresets = false
    ): Tag[] {
        // let excludesKeys = ['name', ...primaryKeys]
        let excludesKeys = ['name']

        if (!tagConfig) {
            return items.filter((item) => !excludesKeys.includes(item.key))
        }

        excludesKeys = [...excludesKeys, ...Object.keys(tagConfig.tags)]

        if (presets && excludeOtherPresets) {
            const keysInPresetsConfig: string[] = []
            for (const pid of tagConfig.presets) {
                const currentPreset = presets[pid]
                if (currentPreset?.key) {
                    keysInPresetsConfig.push(currentPreset.key)
                }
            }
            excludesKeys = [...excludesKeys, ...keysInPresetsConfig]
        }

        if (countryCode && presets) {
            const excludedKeys: string[] = []
            for (const pid of tagConfig.presets) {
                const currentPreset = presets[pid]
                if (
                    currentPreset?.countryCode &&
                    !currentPreset.countryCode.includes(countryCode) &&
                    currentPreset.key
                ) {
                    excludedKeys.push(currentPreset.key)
                }
            }
            excludesKeys = [...excludesKeys, ...excludedKeys]
        }

        return items.filter((item) => !excludesKeys.includes(item.key))
    }
}
