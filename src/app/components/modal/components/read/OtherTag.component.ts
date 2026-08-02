import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import type { Tag } from '@osmgo/type'

@Component({
    selector: 'read-other-tag',
    template: `
        <article class="read-other-tag">
            <strong>{{ tag().key }}</strong>
            <p><mat-icon fontSet="material-symbols-rounded">code</mat-icon>{{ tag().value }}</p>
        </article>
    `,
    styles: [
        `
        :host { display: block; }
        .read-other-tag { padding: 14px 16px; border: 1px solid var(--osmgo-divider); border-radius: 16px; background: var(--osmgo-surface); }
        strong { color: var(--osmgo-ink-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; }
        p { display: flex; align-items: center; gap: 6px; margin: 6px 0 0; overflow-wrap: anywhere; }
        mat-icon { width: 18px; height: 18px; color: var(--osmgo-map-blue); font-size: 18px; }
    `,
    ],
    imports: [MatIconModule],
})
export class ReadOtherTag {
    readonly tag = input.required<Tag>()
}
