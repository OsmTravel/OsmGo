import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit {
    @Input() tagConfig
    @Input() language
    @Input() countryCode
    @Output() fixDeprecated = new EventEmitter()

    constructor() {}

    ngOnInit() {}
}
