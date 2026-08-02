import { Component, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { Tag } from '@osmgo/type'

@Component({
    selector: 'edit-other-tag',
    template: `
        <article class="edit-other-tag">
            <strong><mat-icon fontSet="material-symbols-rounded">code</mat-icon>{{ tag().key }}</strong>
            <div>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <input matInput type="text" [(ngModel)]="tag().value" [placeholder]="tag().key" />
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Supprimer ce tag" (click)="eventDeleteTag()">
                    <mat-icon fontSet="material-symbols-rounded">delete</mat-icon>
                </button>
            </div>
        </article>
    `,
    styles: [
        `
        :host { display: block; }
        .edit-other-tag { padding: 12px 14px; border: 1px solid var(--osmgo-divider); border-radius: 16px; background: var(--osmgo-surface); }
        strong { display: flex; align-items: center; gap: 5px; color: var(--osmgo-ink-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; }
        strong mat-icon { width: 17px; height: 17px; font-size: 17px; }
        .edit-other-tag > div { display: grid; grid-template-columns: minmax(0, 1fr) 48px; align-items: center; gap: 4px; }
        mat-form-field { width: 100%; }
        button { color: var(--osmgo-error); }
    `,
    ],
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
    ],
})
export class EditOtherTag {
    readonly tag = input.required<Tag>()
    readonly deleteTag = output<Tag>()

    eventDeleteTag(): void {
        this.deleteTag.emit(this.tag())
    }
}
