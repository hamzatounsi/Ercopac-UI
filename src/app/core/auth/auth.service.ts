import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { API_AUTH_URL } from '../config/api.config';

export type AppRole =
  | 'PLATFORM_OWNER'
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'GENERAL_MANAGER'
  | 'DEPARTMENT_MANAGER'
  | 'EMPLOYEE'
  | 'SALES_MANAGER'
  | 'CLIENT';

interface JwtPayload {
  sub?: string;
  userId?: number;
  role?: string;
  roles?: string[];
  organisationId?: number;
  organisationName?: string;
  orgName?: string;
  organizationName?: string;
  organisation?: string;
  exp?: number;
  fullName?: string;
  name?: string;
  username?: string;
}

export interface LoginResponse {
  token: string | null;
  userId: number;
  email: string;
  role: AppRole;
  organisationId: number | null;
  organisationCode: string | null;
  organisationName: string | null;
  passwordResetRequired: boolean;
  resetStatus: string | null;
  resetToken: string | null;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private loginUrl = `${API_AUTH_URL}/login`;

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(this.loginUrl, { username, password })
      .pipe(
        tap(res => {
          if (res.token) {
            localStorage.setItem('token', res.token);
          }
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
    return this.isTokenValid();
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getRoles(): AppRole[] {
    const payload = this.getPayload();
    if (!payload) return [];

    const roles = payload.roles || (payload.role ? [payload.role] : []);
    return roles
      .map(role => role.replace(/^ROLE_/, '') as AppRole)
      .filter((role, index, values) => values.indexOf(role) === index);
  }

  getOrganisationName(): string {
    const token = localStorage.getItem('token');

    if (!token) {
      return '';
    }

    try {
      const payload = jwtDecode<JwtPayload>(token);

      return payload.organisationName
        || payload.orgName
        || payload.organizationName
        || payload.organisation
        || '';
    } catch {
      return '';
    }
  }

  getCurrentUsername(): string {
    const token = this.getToken();
    if (!token) return '';

    try {
      const payload = jwtDecode<JwtPayload>(token);
      return payload.fullName || payload.name || payload.username || payload.sub || '';
    } catch {
      return '';
    }
  }

  getCurrentRole(): AppRole | '' {
    return this.getRoles()[0] || '';
  }

  getCurrentUserId(): number | null {
    return this.getPayload()?.userId ?? null;
  }

  getOrganisationId(): number | null {
    return this.getPayload()?.organisationId ?? null;
  }

  getHomeRoute(): string {
    switch (this.getCurrentRole()) {
      case 'PLATFORM_OWNER': return '/owner';
      case 'PLATFORM_ADMIN': return '/owner';
      case 'ORG_ADMIN': return '/org-admin';
      case 'GENERAL_MANAGER': return '/gm';
      case 'DEPARTMENT_MANAGER': return '/department';
      case 'EMPLOYEE': return '/employee';
      case 'SALES_MANAGER': return '/tickets';
      case 'CLIENT': return '/tickets';
      default: return '/login';
    }
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<any>(`${API_AUTH_URL}/password-reset/reset`, {
      token,
      newPassword
    });
  }

  requestPasswordReset(email: string) {
    return this.http.post<any>(`${API_AUTH_URL}/password-reset/request`, { email });
  }

  checkApprovedReset(email: string) {
    return this.http.post<any>(`${API_AUTH_URL}/password-reset/check-approved`, {
      email
    });
  }

  private getPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }
}
