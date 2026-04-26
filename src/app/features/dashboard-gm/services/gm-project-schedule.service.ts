import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_GM_URL } from 'src/app/core/config/api.config';
import { ProjectScheduleInitRequest } from '../models/project-schedule-init.model';
import { InitializedProjectResponse } from '../models/initialized-project-response.model';

@Injectable({
  providedIn: 'root'
})
export class GmProjectScheduleService {
  private readonly baseUrl = API_GM_URL;

  constructor(private http: HttpClient) {}

  initializeProjectSchedule(
    payload: ProjectScheduleInitRequest
  ): Observable<InitializedProjectResponse> {
    return this.http.post<InitializedProjectResponse>(
      `${this.baseUrl}/projects/schedule-init`,
      payload
    );
  }
}