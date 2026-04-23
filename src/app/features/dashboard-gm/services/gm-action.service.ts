import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActionItem } from '../models/action-item.model';
import { ActionSummary } from '../models/action-summary.model';

@Injectable({
  providedIn: 'root'
})
export class GmActionService {
  private readonly baseUrl = 'http://localhost:8087/api/projects';

  constructor(private http: HttpClient) {}

  getRows(projectId: number): Observable<ActionItem[]> {
    return this.http.get<ActionItem[]>(`${this.baseUrl}/${projectId}/actions`);
  }

  getSummary(projectId: number): Observable<ActionSummary> {
    return this.http.get<ActionSummary>(`${this.baseUrl}/${projectId}/actions/summary`);
  }

  create(projectId: number, payload: any): Observable<ActionItem> {
    return this.http.post<ActionItem>(`${this.baseUrl}/${projectId}/actions`, payload);
  }

  update(projectId: number, id: number, payload: any): Observable<ActionItem> {
    return this.http.put<ActionItem>(`${this.baseUrl}/${projectId}/actions/${id}`, payload);
  }

  delete(projectId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/actions/${id}`);
  }

  addComment(projectId: number, id: number, text: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${projectId}/actions/${id}/comments`, { text });
  }

  getAvailableAssignees(projectId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${projectId}/actions/assignees`);
  }
}