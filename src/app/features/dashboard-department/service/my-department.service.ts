import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DepartmentManager } from '../models/department-manager.model';
import { MyDepartmentResponse } from '../models/my-department-response.model';
import { DepartmentHoliday } from '../models/department-holiday.model';
import { CreateDepartmentHolidayRequest } from '../models/create-department-holiday-request.model';
import { API_DEPARTMENT_DASHBOARD_URL } from 'src/app/core/config/api.config';

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

  getDepartments() {
    return this.http.get<string[]>(`${this.baseUrl}/departments`);
  }
}
