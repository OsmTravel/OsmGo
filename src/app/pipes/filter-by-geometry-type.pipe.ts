import { Pipe, PipeTransform } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'filterByByGeometryType',
})
export class FilterByByGeometryTypePipe implements PipeTransform {
    transform(
        tagsConfig: TagConfig[],
        geometriesType: ('point' | 'vertex' | 'line' | 'area')[]
    ): any {
        if (!geometriesType || geometriesType.length == 0) {
            return tagsConfig
        }

        const filteredTags = tagsConfig.filter((tc) => {
            if (!tc.geometry) {
                return true
            }
            for (let g of geometriesType) {
                if (tc.geometry.includes(g)) {
                    return true
                }
            }

            return false
        })
        return filteredTags
    }
}
