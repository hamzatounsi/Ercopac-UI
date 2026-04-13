import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectBaseline } from '../models/project-baseline.model';

export interface CreateProjectBaselineRequest {
  name: string;
  snapshotJson: string;
}

@Injectable({
  providedIn: 'root'
})
export class GmProjectBaselineService {
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  getBaselines(projectId: number): Observable<ProjectBaseline[]> {
    return this.http.get<ProjectBaseline[]>(`${this.baseUrl}/${projectId}/baselines`);
  }

  createBaseline(projectId: number, payload: CreateProjectBaselineRequest): Observable<ProjectBaseline> {
    return this.http.post<ProjectBaseline>(`${this.baseUrl}/${projectId}/baselines`, payload);
  }

  deleteBaseline(projectId: number, baselineId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/baselines/${baselineId}`);
  }
}