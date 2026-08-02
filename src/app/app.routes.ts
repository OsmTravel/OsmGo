import { Routes } from '@angular/router'
import { MainPage } from '@components/main/main'

export const routes: Routes = [
    {
        path: '',
        component: MainPage,
        children: [
            { path: 'callback', pathMatch: 'full', redirectTo: '' },
            {
                path: 'about',
                data: { overlaySize: 'compact' },
                loadComponent: () =>
                    import('@components/about/about').then(
                        (module) => module.AboutPage
                    ),
            },
            {
                path: 'settings',
                data: { overlaySize: 'standard' },
                loadComponent: () =>
                    import('@components/settings/settings').then(
                        (module) => module.SettingsPage
                    ),
            },
            {
                path: 'pushData',
                data: { overlaySize: 'wide' },
                loadComponent: () =>
                    import('@components/pushDataToOsm/pushDataToOsm').then(
                        (module) => module.PushDataToOsmPage
                    ),
            },
            {
                path: 'tags',
                data: { overlaySize: 'standard' },
                loadComponent: () =>
                    import(
                        '@components/manage-tags/manage-tags.component'
                    ).then((module) => module.ManageTagsComponent),
            },
            {
                path: 'basemaps/:lng/:lat',
                data: { overlaySize: 'wide' },
                loadComponent: () =>
                    import('@components/basemaps/basemaps.component').then(
                        (module) => module.BasemapsComponent
                    ),
            },
        ],
    },
    { path: '**', pathMatch: 'full', redirectTo: '' },
]
