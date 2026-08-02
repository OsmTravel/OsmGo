import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'

@Injectable({ providedIn: 'root' })
export class OverlayNavigationService {
    private readonly router = inject(Router)

    open(commands: string | readonly unknown[]): Promise<boolean> {
        const normalizedCommands = Array.isArray(commands)
            ? commands
            : [commands]
        return this.router.navigate(normalizedCommands, {
            queryParamsHandling: 'preserve',
        })
    }

    close(): Promise<boolean> {
        return this.router.navigate(['/'], {
            queryParamsHandling: 'preserve',
            replaceUrl: true,
        })
    }
}
