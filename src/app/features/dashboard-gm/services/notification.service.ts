import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.base}/mine`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
