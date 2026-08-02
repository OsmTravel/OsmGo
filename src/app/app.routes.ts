import { Routes } from '@angular/router'
import { AboutPage } from '@components/about/about'
import { BasemapsComponent } from '@components/basemaps/basemaps.component'
import { MainPage } from '@components/main/main'
import { ManageTagsComponent } from '@components/manage-tags/manage-tags.component'
import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'
import { SettingsPage } from '@components/settings/settings'

export const routes: Routes = [
    {
        path: '',
        component: MainPage,
        children: [{ path: 'callback', component: MainPage }],
    },
    { path: 'about', component: AboutPage },
    { path: 'settings', component: SettingsPage },
    { path: 'pushData', component: PushDataToOsmPage },
    { path: 'tags', component: ManageTagsComponent },
    { path: 'basemaps/:lng/:lat', component: BasemapsComponent },
    { path: '**', pathMatch: 'full', redirectTo: '' },
]
