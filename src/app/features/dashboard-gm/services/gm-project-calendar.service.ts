import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectCalendar } from '../models/project-calendar.model';

export interface CreateProjectCalendarRequest {
  name: string;
  workingDays: number[];
  hoursPerDay: number;
  startTime: string;
  isDefault?: boolean;
}

export interface UpdateProjectCalendarRequest {
  name: string;
  workingDays: number[];
  hoursPerDay: number;
  startTime: string;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GmProjectCalendarService {
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  getCalendars(projectId: number): Observable<ProjectCalendar[]> {
    return this.http.get<ProjectCalendar[]>(`${this.baseUrl}/${projectId}/calendars`);
  }

  createCalendar(projectId: number, payload: CreateProjectCalendarRequest): Observable<ProjectCalendar> {
    return this.http.post<ProjectCalendar>(`${this.baseUrl}/${projectId}/calendars`, payload);
  }

  updateCalendar(projectId: number, calendarId: number, payload: UpdateProjectCalendarRequest): Observable<ProjectCalendar> {
    return this.http.put<ProjectCalendar>(`${this.baseUrl}/${projectId}/calendars/${calendarId}`, payload);
  }

  deleteCalendar(projectId: number, calendarId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/calendars/${calendarId}`);
  }

  makeDefault(projectId: number, calendarId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${projectId}/calendars/${calendarId}/make-default`, {});
  }
}