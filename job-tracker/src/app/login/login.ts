import { Component, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { environment } from '../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements AfterViewInit {
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(private authService: Auth, private router: Router) {}

  ngAfterViewInit() {
    this.initGoogleAuth();
  }

  private initGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleCredentialResponse(response),
      });

      const btnElement = document.getElementById('googleBtnLogin');
      if (btnElement) {
        google.accounts.id.renderButton(btnElement, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
        });
      }
    } else {
      setTimeout(() => this.initGoogleAuth(), 500);
    }
  }

  handleGoogleCredentialResponse(response: any) {
    if (!response || !response.credential) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res) => {
        this.authService.storeToken(res.access_token);
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.formatAuthError(err, 'Google sign-in failed. Please try again.'));
      },
    });
  }

  onSubmit() {
    if (!this.email().trim() || !this.password().trim()) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email().trim(), this.password()).subscribe({
      next: (response) => {
        this.authService.storeToken(response.access_token);
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.formatAuthError(err, 'Incorrect email or password. Please try again.'));
      },
    });
  }

  private formatAuthError(err: any, fallbackMessage: string): string {
    const detail = err?.error?.detail;
    if (err?.status === 404 || detail === 'Not Found') {
      return 'No account found with this email. Please check your email or create a new account.';
    }
    if (detail === 'Invalid Credentials' || err?.status === 401) {
      return 'Incorrect email or password. Please try again.';
    }
    return detail || fallbackMessage;
  }
}