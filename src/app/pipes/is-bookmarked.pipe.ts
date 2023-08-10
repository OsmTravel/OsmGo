import { Pipe, PipeTransform } from '@angular/core'
import { TagConfig } from '@osmgo/type'

@Pipe({
    name: 'isBookmarked',
})
export class IsBookmarkedPipe implements PipeTransform {
    transform(tagConfig: TagConfig, bookmarksIds: string[]): any {
        if (!tagConfig.id || !bookmarksIds) {
            return false
        }
        return bookmarksIds.includes(tagConfig.id)
    }
}
