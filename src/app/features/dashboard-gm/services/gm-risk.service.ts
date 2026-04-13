import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RiskItem } from '../models/risk-item.model';
import { RiskSummary } from '../models/risk-summary.model';

@Injectable({
  providedIn: 'root'
})
export class GmRiskService {
  private readonly baseUrl = 'http://localhost:8087/api/projects';

  constructor(private http: HttpClient) {}

  getRisks(projectId: number): Observable<RiskItem[]> {
    return this.http.get<RiskItem[]>(`${this.baseUrl}/${projectId}/risks`);
  }

  getSummary(projectId: number): Observable<RiskSummary> {
    return this.http.get<RiskSummary>(`${this.baseUrl}/${projectId}/risks/summary`);
  }

  createRisk(projectId: number, payload: any): Observable<RiskItem> {
    return this.http.post<RiskItem>(`${this.baseUrl}/${projectId}/risks`, payload);
  }

  updateRisk(projectId: number, riskId: number, payload: any): Observable<RiskItem> {
    return this.http.put<RiskItem>(`${this.baseUrl}/${projectId}/risks/${riskId}`, payload);
  }

  deleteRisk(projectId: number, riskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/risks/${riskId}`);
  }
}