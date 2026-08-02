import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'

export interface ConfirmDialogData {
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    destructive?: boolean
}

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.html',
    styleUrls: ['./confirm-dialog.scss'],
    imports: [MatButtonModule, MatDialogModule, MatIconModule],
})
export class ConfirmDialogComponent {
    readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA)
    private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>)

    cancel(): void {
        this.dialogRef.close(false)
    }

    confirm(): void {
        this.dialogRef.close(true)
    }
}
