import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FinanceEntry } from '../models/finance-entry.model';
import { FinanceSummary } from '../models/finance-summary.model';
import {
  FinanceSettings,
  ApplyFinanceTemplateRequest,
  ApplyFinanceTemplateResult
} from '../models/finance-settings.model';

@Injectable({
  providedIn: 'root'
})
export class GmFinanceService {
  private readonly baseUrl = 'http://localhost:8087/api/projects';
  private readonly settingsUrl = 'http://localhost:8087/api/finance/settings';

  constructor(private http: HttpClient) {}

  getFinanceRows(projectId: number): Observable<FinanceEntry[]> {
    return this.http.get<FinanceEntry[]>(`${this.baseUrl}/${projectId}/finance`);
  }

  getFinanceSummary(projectId: number): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(`${this.baseUrl}/${projectId}/finance/summary`);
  }

  importFinance(projectId: number, rows: any[]) {
    return this.http.post(`${this.baseUrl}/${projectId}/finance/import`, rows);
  }

  recalculateLabour(projectId: number) {
    return this.http.post(`${this.baseUrl}/${projectId}/finance/recalculate-labour`, {});
  }

  getFinanceSettings(): Observable<FinanceSettings> {
    return this.http.get<FinanceSettings>(this.settingsUrl);
  }

  saveFinanceSettings(payload: FinanceSettings): Observable<FinanceSettings> {
    return this.http.put<FinanceSettings>(this.settingsUrl, payload);
  }

  applyFinanceTemplate(payload: ApplyFinanceTemplateRequest): Observable<ApplyFinanceTemplateResult> {
    return this.http.post<ApplyFinanceTemplateResult>(`${this.settingsUrl}/apply-template`, payload);
  }
}