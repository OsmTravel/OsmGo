import { PushDataToOsmPage } from '@components/pushDataToOsm/pushDataToOsm'
import { AboutPage } from '@components/about/about'
import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { MainPage } from '@components/main/main'
import { SettingsPage } from '@components/settings/settings'
import { LoginPage } from '@components/login/login.component'

import { ManageTagsComponent } from '@components/manage-tags/manage-tags.component'
import { BasemapsComponent } from '@components/basemaps/basemaps.component'

const routes: Routes = [
    { path: '', component: MainPage },
    { path: 'about', component: AboutPage },
    { path: 'settings', component: SettingsPage },
    { path: 'pushData', component: PushDataToOsmPage },
    { path: 'login', component: LoginPage },
    { path: 'tags', component: ManageTagsComponent },
    { path: 'basemaps/:lng/:lat', component: BasemapsComponent },
    { path: '**', pathMatch: 'full', redirectTo: '' },
]

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: false })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
