import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  register(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/auth/register/`, {
      email,
      plain_password: password,
    });
  }

  login(email: string, password: string) {
    return this.http.post<{ access_token: string; token_type: string }>(
      `${this.apiUrl}/auth/login`,
      {
        email,
        plain_password: password,
      }
    );
  }

  loginWithGoogle(idToken: string) {
    return this.http.post<{ access_token: string; token_type: string }>(
      `${this.apiUrl}/auth/google`,
      { id_token: idToken }
    );
  }

  storeToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return true;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  logout() {
    localStorage.removeItem('access_token');
  }
}
