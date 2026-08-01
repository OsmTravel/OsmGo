import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core'

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class AlertComponent implements OnInit {
    @Input() tagConfig
    @Input() language
    @Input() countryCode
    @Output() fixDeprecated = new EventEmitter()

    constructor() {}

    ngOnInit() {}
}
