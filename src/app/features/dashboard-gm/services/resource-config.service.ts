import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DepartmentDto {
  id: number;
  code: string;
  label: string;
}

export interface ResourceTypeConfigDto {
  id: number;
  code: string;
  label: string;
  colour: string;
  departmentId: number | null;
  departmentCode: string | null;
  defaultRate: number | null;
  assignable: boolean;
  active: boolean;
}

export interface SaveDepartmentRequest {
  code: string;
  label: string;
}

export interface SaveResourceTypeRequest {
  code: string;
  label: string;
  colour: string;
  departmentId: number | null;
  defaultRate: number | null;
  assignable: boolean;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceConfigService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(`${this.baseUrl}/departments`);
  }

  createDepartment(payload: SaveDepartmentRequest): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(`${this.baseUrl}/departments`, payload);
  }

  getResourceTypes(): Observable<ResourceTypeConfigDto[]> {
    return this.http.get<ResourceTypeConfigDto[]>(`${this.baseUrl}/resource-types`);
  }

  createResourceType(payload: SaveResourceTypeRequest): Observable<ResourceTypeConfigDto> {
    return this.http.post<ResourceTypeConfigDto>(`${this.baseUrl}/resource-types`, payload);
  }

  updateResourceType(id: number, payload: SaveResourceTypeRequest): Observable<ResourceTypeConfigDto> {
    return this.http.put<ResourceTypeConfigDto>(`${this.baseUrl}/resource-types/${id}`, payload);
  }

  deleteResourceType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/resource-types/${id}`);
  }
}