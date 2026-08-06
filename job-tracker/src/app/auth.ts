import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  register(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/auth/register/`, {
      email,
      plain_password: password
    });
  }

  login(email: string, password: string) {
    return this.http.post<{access_token: string, token_type: string}>(
      `${this.apiUrl}/auth/login`, {
        email, 
        plain_password: password 
      });
  }

  storeToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  logout(){
    localStorage.removeItem('access_token');
  }
}
