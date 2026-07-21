import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_AUTH_URL } from 'src/app/core/config/api.config';
import { Observable } from 'rxjs';

export interface PasswordResetRequestDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  status: string;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GmSecurityService {
  private baseUrl = `${API_AUTH_URL}/password-reset`;

  constructor(private http: HttpClient) {}

  getPendingRequests(): Observable<PasswordResetRequestDto[]> {
    return this.http.get<PasswordResetRequestDto[]>(`${this.baseUrl}/pending`);
  }

  approve(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number, note = ''): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/reject`, { note });
  }
}
