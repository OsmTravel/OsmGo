import { Injectable, HostListener } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  promptEvent

  constructor(private swUpdate: SwUpdate) {

    swUpdate.available.subscribe(event => {
      console.log('PwaService', event);
      // if (askUserToUpdate()) {
      //   window.location.reload();
      // }
    });
  }

  deferredPrompt: any;
  showButtonPwaInstall = false;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e) {
    console.log(e);
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = e;
    this.showButtonPwaInstall = true;
    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice
    .then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      this.deferredPrompt = null;
    });
  }
}
