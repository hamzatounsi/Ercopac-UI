import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';

export interface ProjectMilestone {
  projectId: number;
  projectCode: string;
  projectName: string;
  milestoneTypeId: number;
  milestoneTypeCode: string;
  milestoneTypeLabel: string;
  milestoneTypeColor: string;
  milestoneTypeLetterCode: string;
  milestoneDate: string;
  pmCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {
  private readonly baseUrl = `${API_BASE_URL}/milestones`;

  constructor(private http: HttpClient) {}

  // --- Milestone Types (Settings) ---
  getMilestoneTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/types`);
  }

  createMilestoneType(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/types`, payload);
  }

  updateMilestoneType(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/types/${id}`, payload);
  }

  deleteMilestoneType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/types/${id}`);
  }

  // --- Project Milestones (Dashboard) ---
  getProjectMilestones(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/${projectId}`);
  }
  
  getMilestonesByDateRange(projectIds: number[], startDate: string, endDate: string): Observable<ProjectMilestone[]> {
    const params = new HttpParams()
      .set('projectIds', projectIds.join(','))
      .set('startDate', startDate)
      .set('endDate', endDate);
      
    return this.http.get<ProjectMilestone[]>(`${this.baseUrl}/range`, { params });
  }
}