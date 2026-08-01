import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AboutPage } from '@components/about/about'
import { BasemapsComponent } from '@components/basemaps/basemaps.component'
import { MainPage } from '@components/main/main'
import { ManageTagsComponent } from '@components/manage-tags/manage-tags.component'
import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'
import { SettingsPage } from '@components/settings/settings'

const routes: Routes = [
    {
        path: '',
        component: MainPage,
        children: [
            { path: 'callback', component: MainPage }, // Ajoutez cette sous-route
        ],
    },
    { path: 'about', component: AboutPage },
    { path: 'settings', component: SettingsPage },
    { path: 'pushData', component: PushDataToOsmPage },
    { path: 'tags', component: ManageTagsComponent },
    { path: 'basemaps/:lng/:lat', component: BasemapsComponent },
    { path: '**', pathMatch: 'full', redirectTo: '' },
]

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: false })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
