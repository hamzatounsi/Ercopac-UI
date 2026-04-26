import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectDashboardRow } from '../models/project-dashboard-row.model';
import { ProjectDetails } from '../models/project-details.model';
import { API_GM_DASHBOARD_URL, API_PROJECTS_URL } from 'src/app/core/config/api.config';

export interface PortfolioKpiResponse {
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  averageProgress: number;
  totalBudget: number;
  estimatedCost: number;
  totalTasks: number;
  completedTasks: number;
  countriesCount: number;
  projectManagersCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  overdueProjects: number;
  onTimeRate: number;
}

export interface ProjectKpiResponse {
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  averageTaskProgress: number;
  projectBudget: number;
  estimatedCost: number;
  plannedDurationDays: number;
  overdueTasks: number;
  riskLevel?: string;
}

export interface UpsertProjectRequest {
  name: string;
  code: string;
  customer?: string;
  category?: string;
  country?: string;
  projectType?: string;
  projectPhase?: string;
  riskLevel?: string;
  plannedStart?: string;
  plannedEnd?: string;
  projectManagerName?: string;
  programManagerName?: string;
  salesManagerName?: string;
  projectBudget?: number;
  estimatedCost?: number;
  comment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GmDashboardService {
private readonly baseUrl = API_GM_DASHBOARD_URL;
private readonly projectsUrl = API_PROJECTS_URL;

  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectDashboardRow[]> {
    return this.http.get<ProjectDashboardRow[]>(`${this.baseUrl}/projects`);
  }

  getPortfolioKpis(): Observable<PortfolioKpiResponse> {
    return this.http.get<PortfolioKpiResponse>(`${this.baseUrl}/kpis/portfolio`);
  }

  getProjectKpis(projectId: number): Observable<ProjectKpiResponse> {
    return this.http.get<ProjectKpiResponse>(`${this.baseUrl}/projects/${projectId}/kpis`);
  }

  getProjectById(id: number): Observable<ProjectDetails> {
    return this.http.get<ProjectDetails>(`${this.projectsUrl}/${id}`);
  }

  createProject(payload: UpsertProjectRequest): Observable<ProjectDashboardRow> {
    return this.http.post<ProjectDashboardRow>(this.projectsUrl, payload);
  }

  updateProject(id: number, payload: UpsertProjectRequest): Observable<ProjectDashboardRow> {
    return this.http.put<ProjectDashboardRow>(`${this.projectsUrl}/${id}`, payload);
  }

  archiveProject(id: number): Observable<void> {
    return this.http.patch<void>(`${this.projectsUrl}/${id}/archive`, {});
  }
}