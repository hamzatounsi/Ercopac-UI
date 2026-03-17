import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectDashboardRow } from '../models/project-dashboard-row.model';
import { ProjectDetails } from '../models/project-details.model';

@Injectable({ providedIn: 'root' })
export class GmDashboardService {
    getProjectById(id: number) {
    return this.http.get<ProjectDetails>(`/api/projects/${id}`);
    }
  private baseUrl = '/api/gm/dashboard';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectDashboardRow[]> {
    return this.http.get<ProjectDashboardRow[]>(`${this.baseUrl}/projects`);
  }
}