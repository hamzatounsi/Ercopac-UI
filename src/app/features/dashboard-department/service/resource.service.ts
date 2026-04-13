import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ResourceListItem } from '../models/resource-list-item.model';
import { ResourceDetails } from '../models/resource-details.model';
import { CreateResourceRequest } from '../models/create-resource-request.model';
import { UpdateResourceRequest } from '../models/update-resource-request.model';
import { ResourceOption } from '../models/resource-option.model';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private readonly apiUrl = 'http://localhost:8090/api/resources';

  constructor(private http: HttpClient) {}

  getResources(filters?: {
    search?: string;
    departmentCode?: string;
    role?: string;
    active?: boolean | null;
    internalUser?: boolean | null;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<PageResponse<ResourceListItem>> {
    let params = new HttpParams();

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.departmentCode) {
      params = params.set('departmentCode', filters.departmentCode);
    }
    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.active !== null && filters?.active !== undefined) {
      params = params.set('active', filters.active);
    }
    if (filters?.internalUser !== null && filters?.internalUser !== undefined) {
      params = params.set('internalUser', filters.internalUser);
    }
    if (filters?.page !== undefined) {
      params = params.set('page', filters.page);
    }
    if (filters?.size !== undefined) {
      params = params.set('size', filters.size);
    }
    if (filters?.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http.get<PageResponse<ResourceListItem>>(this.apiUrl, { params });
  }

  getResourceById(id: number): Observable<ResourceDetails> {
    return this.http.get<ResourceDetails>(`${this.apiUrl}/${id}`);
  }

  createResource(payload: CreateResourceRequest): Observable<ResourceDetails> {
    return this.http.post<ResourceDetails>(this.apiUrl, payload);
  }

  updateResource(id: number, payload: UpdateResourceRequest): Observable<ResourceDetails> {
    return this.http.put<ResourceDetails>(`${this.apiUrl}/${id}`, payload);
  }

  updateResourceStatus(id: number, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { active });
  }

  getResourceOptions(departmentCode?: string, role?: string): Observable<ResourceOption[]> {
    let params = new HttpParams();

    if (departmentCode) {
      params = params.set('departmentCode', departmentCode);
    }
    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<ResourceOption[]>(`${this.apiUrl}/options`, { params });
  }

  getDepartmentCodes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/meta/departments`);
  }

  getResourceTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/meta/resource-types`);
  }

  getSeniorities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/meta/seniority-levels`);
  }
}