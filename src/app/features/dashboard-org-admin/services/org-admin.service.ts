import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ADMIN_URL, API_AUTH_URL, API_BASE_URL, API_ORG_ADMIN_URL } from 'src/app/core/config/api.config';
import {
  ApiErrorBody,
  CustomerConfig,
  OrganisationAdminOverview,
  OrganisationDepartment,
  OrganisationProfile,
  OrganisationRoleSummary,
  OrganisationResourceType,
  OrganisationUser,
  PageResponse,
  PasswordResetRequest,
  ProjectCategoryConfig,
  ProjectTypeConfig,
  SaveCustomerConfig,
  SaveOrganisationDepartment,
  SaveOrganisationUser,
  SaveOrganisationResourceType,
  SaveProjectCategoryConfig,
  SaveProjectTypeConfig,
  SaveSupplierConfig,
  SecuritySettings,
  SupplierConfig,
  UpdateOrganisationProfile
} from '../models/org-admin.models';

@Injectable({ providedIn: 'root' })
export class OrgAdminService {
  private readonly baseUrl = API_ORG_ADMIN_URL;
  private readonly passwordResetUrl = `${API_AUTH_URL}/password-reset`;
  private readonly configurationUrl = API_ADMIN_URL;

  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<OrganisationAdminOverview> {
    return this.http.get<OrganisationAdminOverview>(`${this.baseUrl}/overview`);
  }

  getProfile(): Observable<OrganisationProfile> {
    return this.http.get<OrganisationProfile>(`${this.baseUrl}/profile`);
  }

  updateProfile(payload: UpdateOrganisationProfile): Observable<OrganisationProfile> {
    return this.http.put<OrganisationProfile>(`${this.baseUrl}/profile`, payload);
  }

  getSecuritySettings(): Observable<SecuritySettings> {
    return this.http.get<SecuritySettings>(`${this.baseUrl}/settings/security`);
  }

  updateSecuritySettings(payload: SecuritySettings): Observable<SecuritySettings> {
    return this.http.put<SecuritySettings>(`${this.baseUrl}/settings/security`, payload);
  }

  getUsers(filters: {
    search?: string;
    departmentId?: number | null;
    role?: string;
    active?: boolean | null;
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Observable<PageResponse<OrganisationUser>> {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 0))
      .set('size', String(filters.size ?? 20))
      .set('sort', filters.sort ?? 'fullName')
      .set('direction', filters.direction ?? 'asc');

    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.departmentId != null) params = params.set('departmentId', String(filters.departmentId));
    if (filters.role) params = params.set('role', filters.role);
    if (filters.active != null) params = params.set('active', String(filters.active));

    return this.http.get<PageResponse<OrganisationUser>>(`${this.baseUrl}/users`, { params });
  }

  createUser(payload: SaveOrganisationUser & { password: string }): Observable<OrganisationUser> {
    return this.http.post<OrganisationUser>(`${this.baseUrl}/users`, payload);
  }

  updateUser(id: number, payload: SaveOrganisationUser): Observable<OrganisationUser> {
    const { password: _password, ...request } = payload;
    return this.http.put<OrganisationUser>(`${this.baseUrl}/users/${id}`, request);
  }

  updateUserStatus(id: number, active: boolean): Observable<OrganisationUser> {
    return this.http.patch<OrganisationUser>(`${this.baseUrl}/users/${id}/status`, { active });
  }

  getDepartments(): Observable<OrganisationDepartment[]> {
    return this.http.get<OrganisationDepartment[]>(`${this.baseUrl}/departments`);
  }

  getResourceTypes(): Observable<OrganisationResourceType[]> {
    return this.http.get<OrganisationResourceType[]>(`${API_BASE_URL}/resource-types`);
  }

  createResourceType(payload: SaveOrganisationResourceType): Observable<OrganisationResourceType> {
    return this.http.post<OrganisationResourceType>(`${API_BASE_URL}/resource-types`, payload);
  }

  updateResourceType(id: number, payload: SaveOrganisationResourceType): Observable<OrganisationResourceType> {
    return this.http.put<OrganisationResourceType>(`${API_BASE_URL}/resource-types/${id}`, payload);
  }

  deactivateResourceType(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/resource-types/${id}`);
  }

  createDepartment(payload: SaveOrganisationDepartment): Observable<OrganisationDepartment> {
    return this.http.post<OrganisationDepartment>(`${this.baseUrl}/departments`, payload);
  }

  updateDepartment(id: number, payload: SaveOrganisationDepartment): Observable<OrganisationDepartment> {
    return this.http.put<OrganisationDepartment>(`${this.baseUrl}/departments/${id}`, payload);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/departments/${id}`);
  }

  getRoles(): Observable<OrganisationRoleSummary[]> {
    return this.http.get<OrganisationRoleSummary[]>(`${this.baseUrl}/roles`);
  }

  getPendingPasswordResets(): Observable<PasswordResetRequest[]> {
    return this.http.get<PasswordResetRequest[]>(`${this.passwordResetUrl}/pending`);
  }

  approvePasswordReset(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.passwordResetUrl}/${id}/approve`, {});
  }

  rejectPasswordReset(id: number, note: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.passwordResetUrl}/${id}/reject`, { note });
  }

  getCategories(): Observable<ProjectCategoryConfig[]> {
    return this.http.get<ProjectCategoryConfig[]>(`${this.configurationUrl}/categories`);
  }

  saveCategory(id: number | null, request: SaveProjectCategoryConfig): Observable<ProjectCategoryConfig> {
    return id === null
      ? this.http.post<ProjectCategoryConfig>(`${this.configurationUrl}/categories`, request)
      : this.http.put<ProjectCategoryConfig>(`${this.configurationUrl}/categories/${id}`, request);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.configurationUrl}/categories/${id}`);
  }

  getProjectTypes(): Observable<ProjectTypeConfig[]> {
    return this.http.get<ProjectTypeConfig[]>(`${this.configurationUrl}/types`);
  }

  saveProjectType(id: number | null, request: SaveProjectTypeConfig): Observable<ProjectTypeConfig> {
    return id === null
      ? this.http.post<ProjectTypeConfig>(`${this.configurationUrl}/types`, request)
      : this.http.put<ProjectTypeConfig>(`${this.configurationUrl}/types/${id}`, request);
  }

  deleteProjectType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.configurationUrl}/types/${id}`);
  }

  getCustomers(): Observable<CustomerConfig[]> {
    return this.http.get<CustomerConfig[]>(`${this.configurationUrl}/customers`);
  }

  saveCustomer(id: number | null, request: SaveCustomerConfig): Observable<CustomerConfig> {
    return id === null
      ? this.http.post<CustomerConfig>(`${this.configurationUrl}/customers`, request)
      : this.http.put<CustomerConfig>(`${this.configurationUrl}/customers/${id}`, request);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.configurationUrl}/customers/${id}`);
  }

  getSuppliers(): Observable<SupplierConfig[]> {
    return this.http.get<SupplierConfig[]>(`${this.baseUrl}/suppliers`);
  }

  saveSupplier(id: number | null, request: SaveSupplierConfig): Observable<SupplierConfig> {
    return id === null
      ? this.http.post<SupplierConfig>(`${this.baseUrl}/suppliers`, request)
      : this.http.put<SupplierConfig>(`${this.baseUrl}/suppliers/${id}`, request);
  }

  deactivateSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/suppliers/${id}`);
  }
}

export function adminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorBody | string | null;
    if (typeof body === 'object' && body?.message) return body.message;
    if (error.status === 0) return 'The administration service is unavailable. Try again shortly.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested item no longer exists.';
    if (error.status === 409) return 'The change conflicts with existing organisation data.';
  }
  return fallback;
}
