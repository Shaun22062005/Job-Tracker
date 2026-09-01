import { Component, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { GoogleAuth } from '../google-auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements AfterViewInit {
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(
    private authService: Auth,
    private googleAuthService: GoogleAuth,
    private router: Router
  ) {}

  ngAfterViewInit() {
    this.googleAuthService.initializeButton('googleHiddenBtnReg', (credential: string) => {
      this.handleGoogleCredentialResponse(credential);
    });
  }

  triggerGoogleAuth() {
    this.googleAuthService.triggerPrompt('googleHiddenBtnReg');
  }

  handleGoogleCredentialResponse(idToken: string) {
    if (!idToken) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.loginWithGoogle(idToken).subscribe({
      next: (res) => {
        this.authService.storeToken(res.access_token);
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.formatAuthError(err, 'Google sign-up failed. Please try again.'));
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

    this.authService.register(this.email().trim(), this.password()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.formatAuthError(err, 'Registration failed. Please try again.'));
      },
    });
  }

  private formatAuthError(err: any, fallbackMessage: string): string {
    const detail = err?.error?.detail;
    if (err?.status === 404 || detail === 'Not Found') {
      return 'Service temporarily updating. Please try again in a few seconds.';
    }
    if (detail === 'Email already registered') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    return detail || fallbackMessage;
  }
}
