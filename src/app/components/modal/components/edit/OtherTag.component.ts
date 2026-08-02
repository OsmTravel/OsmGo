import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonIcon,
    IonInput,
    IonItem,
} from '@ionic/angular/standalone'
import { Tag } from '@osmgo/type'

@Component({
    selector: 'edit-other-tag',
    styleUrls: ['../style.scss'],
    template: `
        <ion-card>
            <ion-card-header>
                <ion-icon name="code"></ion-icon> <b>{{ tag().key }}</b>
            </ion-card-header>
            <ion-card-content>
                <div class="wrapperEdit2cols">
                    <div class="contentEdit2cols">
                        <ion-item>
                            <ion-input
                                type="text"
                                [(ngModel)]="tag().value"
                                [placeholder]="tag().key"
                            ></ion-input>
                        </ion-item>
                    </div>

                    <div class="buttonEdit2cols">
                        <ion-icon
                            (click)="eventDeleteTag()"
                            name="close"
                            style="width: 2em; height: 2em;"
                        ></ion-icon>
                    </div>
                </div>
            </ion-card-content>
        </ion-card>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        FormsModule,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonIcon,
        IonInput,
        IonItem,
    ],
})
export class EditOtherTag {
    readonly tag = input.required<Tag>()
    readonly deleteTag = output<Tag>()

    eventDeleteTag() {
        this.deleteTag.emit(this.tag())
    }
}
