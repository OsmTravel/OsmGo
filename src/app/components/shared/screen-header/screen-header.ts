import { Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { TranslateModule } from '@ngx-translate/core'

@Component({
    selector: 'app-screen-header',
    templateUrl: './screen-header.html',
    styleUrls: ['./screen-header.scss'],
    imports: [
        MatButtonModule,
        MatIconModule,
        MatToolbarModule,
        TranslateModule,
    ],
})
export class ScreenHeaderComponent {
    readonly title = input.required<string>()
    readonly backRequested = output<void>()
}
