import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DepartmentManager } from '../models/department-manager.model';
import { MyDepartmentResponse } from '../models/my-department-response.model';
import { DepartmentHoliday } from '../models/department-holiday.model';
import { CreateDepartmentHolidayRequest } from '../models/create-department-holiday-request.model';
import { DepartmentContext } from '../models/department-context.model';
import { DepartmentSupplier, SaveSupplierRequest } from '../models/department-supplier.model';
import { API_DEPARTMENT_DASHBOARD_URL, API_SUPPLIERS_URL } from 'src/app/core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class MyDepartmentService {
  private readonly baseUrl = API_DEPARTMENT_DASHBOARD_URL;

  constructor(private http: HttpClient) {}

  getManagers(): Observable<DepartmentManager[]> {
    return this.http.get<DepartmentManager[]>(`${this.baseUrl}/managers`);
  }

  getOverview(
    managerId: number,
    timelineView: 'day' | 'week',
    offset: number,
    span: number
  ): Observable<MyDepartmentResponse> {
    const params = new HttpParams()
      .set('managerId', managerId)
      .set('timelineView', timelineView)
      .set('offset', offset)
      .set('span', span);

    return this.http.get<MyDepartmentResponse>(`${this.baseUrl}/overview`, { params });
  }

  getOverviewWithoutManager(
    timelineView: 'day' | 'week',
    offset: number,
    span: number
  ): Observable<MyDepartmentResponse> {
    const params = new HttpParams()
      .set('timelineView', timelineView)
      .set('offset', offset)
      .set('span', span);

    return this.http.get<MyDepartmentResponse>(`${this.baseUrl}/overview`, { params });
  }

  createHoliday(payload: CreateDepartmentHolidayRequest): Observable<DepartmentHoliday> {
    return this.http.post<DepartmentHoliday>(`${this.baseUrl}/holidays`, payload);
  }

  deleteHoliday(holidayId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/holidays/${holidayId}`);
  }

  getOverviewByDepartment(
    departmentCode: string,
    timelineView: string,
    offset: number,
    span: number
  ) {
    return this.http.get<MyDepartmentResponse>(
      `${this.baseUrl}/overview-by-department`,
      {
        params: {
          departmentCode,
          timelineView,
          offset,
          span
        }
      }
    );
  }

  /** Department header and permissions. managerId is ignored for Department Managers (always their own). */
  getContext(managerId: number | null): Observable<DepartmentContext> {
    return this.http.get<DepartmentContext>(`${this.baseUrl}/context`, { params: this.managerParams(managerId) });
  }

  /** Active suppliers linked to the department's resource types. */
  getSuppliers(managerId: number | null): Observable<DepartmentSupplier[]> {
    return this.http.get<DepartmentSupplier[]>(`${this.baseUrl}/suppliers`, { params: this.managerParams(managerId) });
  }

  createSupplier(request: SaveSupplierRequest): Observable<unknown> {
    return this.http.post(API_SUPPLIERS_URL, request);
  }

  updateSupplier(id: number, request: SaveSupplierRequest): Observable<unknown> {
    return this.http.put(`${API_SUPPLIERS_URL}/${id}`, request);
  }

  /** Suppliers are deactivated, not erased: existing task assignments keep them. */
  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${API_SUPPLIERS_URL}/${id}`);
  }

  private managerParams(managerId: number | null): HttpParams {
    return managerId == null ? new HttpParams() : new HttpParams().set('managerId', managerId);
  }

  getDepartments() {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }
}
