import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config'; // Adjust path if needed

export interface ProjectMilestone {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  milestoneTypeId: number;
  milestoneTypeCode: string;
  milestoneTypeLabel: string;
  milestoneTypeColor: string;
  milestoneTypeLetterCode: string;
  milestoneDate: string;
  taskWbsCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class MilestoneService {
  private readonly baseUrl = `${API_BASE_URL}/milestones`;

  constructor(private http: HttpClient) {}

  getMilestoneTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/types`);
  }

  createMilestoneType(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/types`, payload);
  }

  deleteMilestoneType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/types/${id}`);
  }

  getMilestonesByDateRange(projectIds: number[], startDate: string, endDate: string): Observable<ProjectMilestone[]> {
    const params = new HttpParams()
      .set('projectIds', projectIds.join(','))
      .set('startDate', startDate)
      .set('endDate', endDate);
      
    return this.http.get<ProjectMilestone[]>(`${this.baseUrl}/range`, { params });
  }
}