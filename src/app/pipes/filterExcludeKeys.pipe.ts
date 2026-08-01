import { Pipe } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterExcludeKeys',
    pure: false,
})
export class FilterExcludeKeysPipe {
    transform(
        items,
        tagConfig: TagConfig,
        countryCode: string,
        primaryKeys,
        presets,
        excludeOtherPresets = false
    ) {
        // let excludesKeys = ['name', ...primaryKeys]
        let excludesKeys = ['name']

        if (!tagConfig) {
            return items.filter((item) => !excludesKeys.includes(item.key))
        }

        excludesKeys = [...excludesKeys, ...Object.keys(tagConfig.tags)]

        if (presets && excludeOtherPresets) {
            const keysInPresetsConfig = []
            for (const pid of tagConfig.presets) {
                const currentPreset = presets[pid]
                //countryCodes TODO exclude
                keysInPresetsConfig.push(currentPreset.key)
            }
            excludesKeys = [...excludesKeys, ...keysInPresetsConfig]
        }

        if (countryCode && presets) {
            const excludeByCountryconde = []
            for (const pid of tagConfig.presets) {
                const currentPreset = presets[pid]
                if (
                    currentPreset.countryCode &&
                    !currentPreset.countryCode.includes(countryCode)
                ) {
                    excludeByCountryconde.push(presets[pid])
                }
            }
            excludesKeys = [...excludesKeys, ...excludeByCountryconde]
        }

        return items.filter((item) => !excludesKeys.includes(item.key))
    }
}
