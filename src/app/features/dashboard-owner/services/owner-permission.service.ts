import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { PlatformOrganisation } from '../models/platform-organisation.model';
import { RolePermission } from '../models/role-permission.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerPermissionService {

  private readonly baseUrl = `${API_BASE_URL}/platform/permissions`;
  private readonly orgUrl = `${API_BASE_URL}/platform/organisations`;

  constructor(private http: HttpClient) {}

  getOrganisations(): Observable<PlatformOrganisation[]> {
    return this.http.get<PlatformOrganisation[]>(this.orgUrl);
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`);
  }

  getPermissions(organisationId: number, role: string): Observable<RolePermission[]> {
    return this.http.get<RolePermission[]>(`${this.baseUrl}/${organisationId}/${role}`);
  }

  savePermissions(
    organisationId: number,
    role: string,
    permissions: RolePermission[]
  ): Observable<RolePermission[]> {
    return this.http.put<RolePermission[]>(`${this.baseUrl}/${organisationId}/${role}`, {
      permissions
    });
  }
}