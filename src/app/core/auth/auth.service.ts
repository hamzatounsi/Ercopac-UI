import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { API_AUTH_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private loginUrl = `${API_AUTH_URL}/login`;

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<any>(this.loginUrl, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem('token', res.token);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    const decoded: any = jwtDecode(token);
    return decoded.roles || [decoded.role];
  }

  getOrganisationName(): string {
    const token = localStorage.getItem('token');
    console.log(JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])));

    if (!token) {
      return '';
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      return payload.organisationName
        || payload.orgName
        || payload.organizationName
        || payload.organisation
        || '';
    } catch {
      return '';
    }
  }
}