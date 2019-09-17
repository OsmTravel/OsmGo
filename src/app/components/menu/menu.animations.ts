import {
    animate,
    style,
    transition,
    trigger,
    query
} from '@angular/animations';

export const menuAnimations = [

    trigger('menuAnimation', [
        transition(':enter', [
            query('.menuContent', [
                style({ transform: 'translateX(-100%)' }),
                animate('300ms ease-in')
            ]),
            query('.backdrop', [
                style({ opacity: '0.34' }),
                animate('300ms')
            ]),
        ]),
        transition(':leave', [
            query('.menuContent', [
                animate('0.3s ease-out', style({ transform: 'translateX(-100%)' }))
            ]),

            query('.backdrop', [
                animate('0.3s ease-out', style({ opacity: '0' }))
            ]),
        ])
    ])

];

