import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectScheduleInitRequest } from '../models/project-schedule-init.model';
import { InitializedProjectResponse } from '../models/initialized-project-response.model';

@Injectable({
  providedIn: 'root'
})
export class GmProjectScheduleService {
  constructor(private http: HttpClient) {}

  initializeProjectSchedule(
    payload: ProjectScheduleInitRequest
  ): Observable<InitializedProjectResponse> {
    return this.http.post<InitializedProjectResponse>(
      '/api/gm/projects/schedule-init',
      payload
    );
  }
}