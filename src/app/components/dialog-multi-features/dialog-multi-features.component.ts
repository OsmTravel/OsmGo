import { Component, inject, input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { IconComponent } from '@components/icon/icon.component'
import { TranslateModule } from '@ngx-translate/core'
import type { JsonSprites, OsmGoFeature } from '@osmgo/type'

type DialogFeature = OsmGoFeature & {
    properties: OsmGoFeature['properties'] & { _name?: string }
}

@Component({
    selector: 'app-dialog-multi-features',
    templateUrl: './dialog-multi-features.component.html',
    styleUrls: ['./dialog-multi-features.component.scss'],
    imports: [
        IconComponent,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        TranslateModule,
    ],
})
export class DialogMultiFeaturesComponent {
    private readonly dialogRef = inject(
        MatDialogRef<DialogMultiFeaturesComponent>
    )

    readonly features = input.required<DialogFeature[]>()
    readonly jsonSprites = input.required<JsonSprites>()

    selectFeature(feature: DialogFeature) {
        this.dialogRef.close(feature)
    }
}
