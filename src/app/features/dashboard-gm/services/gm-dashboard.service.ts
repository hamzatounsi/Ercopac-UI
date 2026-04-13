import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectDashboardRow } from '../models/project-dashboard-row.model';
import { ProjectDetails } from '../models/project-details.model';

@Injectable({
  providedIn: 'root'
})
export class GmDashboardService {
  private readonly baseUrl = '/api/gm/dashboard';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectDashboardRow[]> {
    return this.http.get<ProjectDashboardRow[]>(`${this.baseUrl}/projects`);
  }

  getPortfolioKpis(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/kpis/portfolio`);
  }

  getProjectKpis(projectId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectId}/kpis`);
  }

  getProjectById(id: number): Observable<ProjectDetails> {
    return this.http.get<ProjectDetails>(`/api/projects/${id}`);
  }
}