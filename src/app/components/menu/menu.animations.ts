import { animate, query, style, transition, trigger } from '@angular/animations'

export const menuAnimations = [
    trigger('menuAnimation', [
        transition(':enter', [
            query(
                '.menu-content',
                [
                    style({ transform: 'translateX(-100%)' }),
                    animate('100ms ease-in'),
                ],
                { optional: true }
            ),
            query('.backdrop', [style({ opacity: '0.34' }), animate('100ms')], {
                optional: true,
            }),
        ]),
        transition(':leave', [
            query(
                '.menu-content',
                [
                    animate(
                        '0.1s ease-out',
                        style({ transform: 'translateX(-100%)' })
                    ),
                ],
                { optional: true }
            ),

            query(
                '.backdrop',
                [animate('0.1s ease-out', style({ opacity: '0' }))],
                { optional: true }
            ),
        ]),
    ]),
]
