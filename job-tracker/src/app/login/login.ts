import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(private authService: Auth, private router: Router) {}

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
        this.errorMessage.set(err?.error?.detail || 'Invalid Credentials');
      },
    });
  }
}