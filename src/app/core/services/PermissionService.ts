import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';

export interface MyPermission {
  module: string;
  canRead: boolean;
  canWrite: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissionsSubject = new BehaviorSubject<MyPermission[]>([]);
  permissions$ = this.permissionsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPermissions(): void {
    this.http.get<MyPermission[]>(`${API_BASE_URL}/permissions/me`)
      .subscribe({
        next: permissions => this.permissionsSubject.next(permissions),
        error: () => this.permissionsSubject.next([])
      });
  }

  canRead(module: string): boolean {
    return this.permissionsSubject.value.some(p => p.module === module && p.canRead);
  }

  canWrite(module: string): boolean {
    return this.permissionsSubject.value.some(p => p.module === module && p.canWrite);
  }
}