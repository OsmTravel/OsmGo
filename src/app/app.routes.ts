import { Routes } from '@angular/router'
import { MainPage } from '@components/main/main'

export const routes: Routes = [
    {
        path: '',
        component: MainPage,
        children: [{ path: 'callback', component: MainPage }],
    },
    {
        path: 'about',
        loadComponent: () =>
            import('@components/about/about').then(
                (module) => module.AboutPage
            ),
    },
    {
        path: 'settings',
        loadComponent: () =>
            import('@components/settings/settings').then(
                (module) => module.SettingsPage
            ),
    },
    {
        path: 'pushData',
        loadComponent: () =>
            import('@components/pushDataToOsm/pushDataToOsm').then(
                (module) => module.PushDataToOsmPage
            ),
    },
    {
        path: 'tags',
        loadComponent: () =>
            import('@components/manage-tags/manage-tags.component').then(
                (module) => module.ManageTagsComponent
            ),
    },
    {
        path: 'basemaps/:lng/:lat',
        loadComponent: () =>
            import('@components/basemaps/basemaps.component').then(
                (module) => module.BasemapsComponent
            ),
    },
    { path: '**', pathMatch: 'full', redirectTo: '' },
]
