import { PushDataToOsmPage } from './components/pushDataToOsm/pushDataToOsm';
import { AboutPage } from './components/about/about';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainPage } from './components/main/main';
import { LoginPage } from './components/login/login';
import { SettingsPage } from './components/settings/settings';

const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },
  { path: 'main', component: MainPage },
  { path: 'about', component: AboutPage },
  { path: 'login', component: LoginPage},
  { path: 'settings', component: SettingsPage},
  { path: 'pushData', component: PushDataToOsmPage}

];

@NgModule({
  imports: [RouterModule.forRoot(routes,  {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
