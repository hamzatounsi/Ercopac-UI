import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChangeRequest } from '../models/change-request.model';
import { ChangeRequestSummary } from '../models/change-request-summary.model';

@Injectable({
  providedIn: 'root'
})
export class GmChangeRequestService {
  private readonly baseUrl = 'http://localhost:8087/api/projects';

  constructor(private http: HttpClient) {}

  getRows(projectId: number): Observable<ChangeRequest[]> {
    return this.http.get<ChangeRequest[]>(`${this.baseUrl}/${projectId}/change-requests`);
  }

  getSummary(projectId: number): Observable<ChangeRequestSummary> {
    return this.http.get<ChangeRequestSummary>(`${this.baseUrl}/${projectId}/change-requests/summary`);
  }

  create(projectId: number, payload: any): Observable<ChangeRequest> {
    return this.http.post<ChangeRequest>(`${this.baseUrl}/${projectId}/change-requests`, payload);
  }

  update(projectId: number, id: number, payload: any): Observable<ChangeRequest> {
    return this.http.put<ChangeRequest>(`${this.baseUrl}/${projectId}/change-requests/${id}`, payload);
  }

  delete(projectId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/change-requests/${id}`);
  }
}