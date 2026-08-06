import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Auth }  from '../auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  constructor (private authService: Auth, private router: Router){}

  email: string = '';
  password: string = '';
  errorMessage: string = '';

  onSubmit() {
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => { 
        this.authService.storeToken(response.access_token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => { 
        this.errorMessage = "Invalid Credentials"; 
      }
    });
  }
}