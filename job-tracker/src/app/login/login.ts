import { Component, signal, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Auth } from '../auth';
import { GoogleAuth } from '../google-auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, AfterViewInit {
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(
    private authService: Auth,
    private googleAuthService: GoogleAuth,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('sessionExpired') === 'true') {
      this.errorMessage.set('Your session has expired. Please sign in again.');
    }
  }

  ngAfterViewInit() {
    this.googleAuthService.initializeButton('googleHiddenBtn', (credential: string) => {
      this.handleGoogleCredentialResponse(credential);
    });
  }

  triggerGoogleAuth() {
    this.googleAuthService.triggerPrompt('googleHiddenBtn');
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