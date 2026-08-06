import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
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

    this.authService.register(this.email().trim(), this.password()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Registration failed.');
      },
    });
  }
}
