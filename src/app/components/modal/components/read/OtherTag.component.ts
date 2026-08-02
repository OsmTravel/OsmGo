import { Component, input } from '@angular/core'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonIcon,
} from '@ionic/angular/standalone'

@Component({
    selector: 'read-other-tag',
    template: `
        <ion-card>
            <ion-card-header>
                <b>{{ tag().key }}</b>
            </ion-card-header>
            <ion-card-content>
                <p><ion-icon name="code"></ion-icon> {{ tag().value }}</p>
            </ion-card-content>
        </ion-card>
    `,
    imports: [IonCard, IonCardContent, IonCardHeader, IonIcon],
})
export class ReadOtherTag {
    readonly tag = input(undefined)
}
