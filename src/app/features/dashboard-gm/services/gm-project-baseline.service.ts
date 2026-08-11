import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PROJECTS_URL } from 'src/app/core/config/api.config';
import { ProjectBaseline } from '../models/project-baseline.model';

@Injectable({ providedIn: 'root' })
export class GmProjectBaselineService {
  constructor(private http: HttpClient) {}

  getBaselines(projectId: number): Observable<ProjectBaseline[]> {
    return this.http.get<ProjectBaseline[]>(
      `${API_PROJECTS_URL}/${projectId}/baselines`
    );
  }

  createBaseline(
    projectId: number,
    payload: { name?: string }
  ): Observable<ProjectBaseline> {
    return this.http.post<ProjectBaseline>(
      `${API_PROJECTS_URL}/${projectId}/baselines`,
      payload
    );
  }

  renameBaseline(
    projectId: number,
    baselineId: number,
    name: string
  ): Observable<ProjectBaseline> {
    return this.http.put<ProjectBaseline>(
      `${API_PROJECTS_URL}/${projectId}/baselines/${baselineId}`,
      { name }
    );
  }

  deleteBaseline(projectId: number, baselineId: number): Observable<void> {
    return this.http.delete<void>(
      `${API_PROJECTS_URL}/${projectId}/baselines/${baselineId}`
    );
  }

  applyBaseline(projectId: number, baselineId: number): Observable<ProjectBaseline> {
    return this.http.put<ProjectBaseline>(
      `${API_PROJECTS_URL}/${projectId}/baselines/${baselineId}/apply`,
      {}
    );
  }
}
