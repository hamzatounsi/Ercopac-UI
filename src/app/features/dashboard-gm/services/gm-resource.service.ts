import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResourceDetails } from '../models/resource-details.model';
import { ResourceListItem } from '../models/resource-list-item.model';
import { CreateResourceRequest } from '../models/create-resource-request.model';
import { UpdateResourceRequest } from '../models/update-resource-request.model';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class GmResourceService {
  private readonly baseUrl = '/api/resources';

  constructor(private http: HttpClient) {}

  getResources(filters?: {
    search?: string;
    departmentCode?: string;
    role?: string;
    active?: boolean;
    internalUser?: boolean;
    page?: number;
    size?: number;
  }): Observable<PageResponse<ResourceListItem>> {
    let params = new HttpParams();

    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.departmentCode) params = params.set('departmentCode', filters.departmentCode);
    if (filters?.role) params = params.set('role', filters.role);
    if (filters?.active !== undefined) params = params.set('active', filters.active);
    if (filters?.internalUser !== undefined) params = params.set('internalUser', filters.internalUser);
    params = params.set('page', filters?.page ?? 0);
    params = params.set('size', filters?.size ?? 200);

    return this.http.get<PageResponse<ResourceListItem>>(this.baseUrl, { params });
  }

  getResourceById(id: number): Observable<ResourceDetails> {
    return this.http.get<ResourceDetails>(`${this.baseUrl}/${id}`);
  }

  createResource(payload: CreateResourceRequest): Observable<ResourceDetails> {
    return this.http.post<ResourceDetails>(this.baseUrl, payload);
  }

  updateResource(id: number, payload: UpdateResourceRequest): Observable<ResourceDetails> {
    return this.http.put<ResourceDetails>(`${this.baseUrl}/${id}`, payload);
  }

  updateResourceStatus(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, { active });
  }

  getDepartmentCodes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/meta/departments`);
  }

  getResourceTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/meta/resource-types`);
  }

  getSeniorities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/meta/seniority-levels`);
  }
}