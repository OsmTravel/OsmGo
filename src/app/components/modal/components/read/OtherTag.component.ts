import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { IonicModule } from '@ionic/angular'

@Component({
    selector: 'read-other-tag',
    template: `
        <ion-card>
            <ion-card-header>
                <b>{{ tag.key }}</b>
            </ion-card-header>
            <ion-card-content>
                <p><ion-icon name="code"></ion-icon> {{ tag.value }}</p>
            </ion-card-content>
        </ion-card>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IonicModule],
})
export class ReadOtherTag {
    @Input() tag
}
