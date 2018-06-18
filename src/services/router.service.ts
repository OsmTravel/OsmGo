import { Injectable } from '@angular/core';
import { App } from 'ionic-angular';
import { PushDataToOsmPage } from '../pages/pushDataToOsm/pushDataToOsm';
import { AboutPage } from '../pages/about/about';
import { LoginPage } from '../pages/login/login';
import { MainPage } from '../pages/main/main';
import { SettingsPage } from '../pages/settings/settings';


@Injectable()
export class RouterService {
    pages = {
        "pushDataToOsmPage": { "component": PushDataToOsmPage },
        "aboutPage": { "component": AboutPage },
        "loginPage": {"component" : LoginPage},
        "mainPage": { "component" : MainPage },
        "settingsPage": { "component" : SettingsPage }
    };

    constructor(private app: App) {

    }


    pushPage(pageName) {
        let nav = this.app.getActiveNavs()[0]
        nav.push(this.pages[pageName].component);
    }

    setRootPage(pageName) {
        let nav = this.app.getActiveNavs()[0]
        nav.setRoot(this.pages[pageName].component);
    }
}