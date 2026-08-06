import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Auth }  from '../auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {

  constructor (private authService: Auth, private router: Router){}

  email: string = '';
  password: string = '';
  errorMessage: string = '';

  onSubmit() {
    this.authService.register(this.email, this.password).subscribe({
      next: (response) => { 
        this.router.navigate(['/login']);
      },
      error: (err) => { 
        this.errorMessage = "Registration failed"; 
      }
    });
  }
}
