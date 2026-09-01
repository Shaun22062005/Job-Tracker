import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleAuth {
  initializeButton(
    containerId: string,
    onSuccessCallback: (idToken: string) => void
  ): void {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => {
          if (response && response.credential) {
            onSuccessCallback(response.credential);
          }
        },
        auto_select: false,
      });

      const container = document.getElementById(containerId);
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
      }
    } else {
      setTimeout(() => this.initializeButton(containerId, onSuccessCallback), 500);
    }
  }

  triggerPrompt(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      const btn = container.querySelector('div[role="button"]') as HTMLElement;
      if (btn) {
        btn.click();
        return;
      }
    }
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.prompt();
    }
  }
}
