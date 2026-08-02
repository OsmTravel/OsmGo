import {
    ChangeDetectionStrategy,
    Component,
    Input,
    input,
    OnInit,
} from '@angular/core'

@Component({
    selector: 'app-icon',
    templateUrl: './icon.component.html',
    styleUrls: ['./icon.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class IconComponent implements OnInit {
    // TODO: Skipped for migration because:
    //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
    //  and migrating would break narrowing currently.
    @Input() jsonSprites
    readonly icon = input(undefined)
    currentSpriteConfig
    styleBackgroundPosition
    devicePixelRatio

    constructor() {}

    ngOnInit() {
        this.devicePixelRatio = window.devicePixelRatio > 1 ? 2 : 1
    }
}
