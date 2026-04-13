import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectTemplate } from '../models/project-template.model';

export interface CreateProjectTemplateRequest {
  name: string;
  scope: 'all' | 'selected';
  description?: string;
  snapshotJson: string;
}

@Injectable({
  providedIn: 'root'
})
export class GmProjectTemplateService {
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  getTemplates(projectId: number): Observable<ProjectTemplate[]> {
    return this.http.get<ProjectTemplate[]>(`${this.baseUrl}/${projectId}/templates`);
  }

  createTemplate(projectId: number, payload: CreateProjectTemplateRequest): Observable<ProjectTemplate> {
    return this.http.post<ProjectTemplate>(`${this.baseUrl}/${projectId}/templates`, payload);
  }

  deleteTemplate(projectId: number, templateId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/templates/${templateId}`);
  }
}