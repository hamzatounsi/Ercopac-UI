import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { FinanceEntry } from '../models/finance-entry.model';
import { FinanceSummary } from '../models/finance-summary.model';
import {
  FinanceSettings,
  ApplyFinanceTemplateRequest,
  ApplyFinanceTemplateResult,
  FinanceWbsTemplateRow
} from '../models/finance-settings.model';

import {
  API_FINANCE_SETTINGS_URL,
  API_PROJECTS_URL
} from 'src/app/core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GmFinanceService {
  private readonly baseUrl = API_PROJECTS_URL;
  private readonly settingsUrl = API_FINANCE_SETTINGS_URL;

  constructor(private http: HttpClient) {}

  getFinanceRows(projectId: number): Observable<FinanceEntry[]> {
    return this.http.get<FinanceEntry[]>(`${this.baseUrl}/${projectId}/finance`);
  }

  getFinanceSummary(projectId: number): Observable<FinanceSummary> {
    return this.http.get<FinanceSummary>(`${this.baseUrl}/${projectId}/finance/summary`);
  }

  importFinance(projectId: number, rows: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/${projectId}/finance/import`, rows);
  }

  recalculateLabour(projectId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${projectId}/finance/recalculate-labour`, {});
  }

  // ─── PHASE 4: mise à jour du Forecast en ligne ──────────────
  // NOTE: cette route doit exister côté backend.
  // PATCH /projects/:projectId/finance/:rowId/forecast  { forecast: number }
  // → doit recalculer EAC (= AC + forecast) et Variance (= Budget - EAC)
  //   côté serveur et renvoyer la ligne FinanceEntry à jour.
  updateForecastValue(projectId: number, rowId: number, forecast: number): Observable<FinanceEntry> {
    return this.http.patch<FinanceEntry>(
      `${this.baseUrl}/${projectId}/finance/${rowId}/forecast`,
      { forecast }
    );
  }

  getFinanceSettings(): Observable<FinanceSettings> {
    return this.http.get<FinanceSettings>(this.settingsUrl);
  }

  saveFinanceSettings(payload: FinanceSettings): Observable<FinanceSettings> {
    return this.http.put<FinanceSettings>(this.settingsUrl, payload);
  }

  applyFinanceTemplate(
    payload: ApplyFinanceTemplateRequest
  ): Observable<ApplyFinanceTemplateResult> {
    return this.http.post<ApplyFinanceTemplateResult>(
      `${this.settingsUrl}/apply-template`,
      payload
    );
  }

  importWbsTemplate(
    rows: FinanceWbsTemplateRow[],
    replaceExisting = true
  ): Observable<FinanceSettings> {
    return this.http.post<FinanceSettings>(
      `${this.settingsUrl}/import-wbs`,
      {
        rows,
        replaceExisting
      }
    );
  }

  // ─── Load Standard WBS Template (from uploaded ODS) ─────────
  // NOTE: suppose une route backend qui sert le WBS_Structure.ods
  // déjà uploadé côté admin et le parse en FinanceWbsTemplateRow[].
  // GET /finance/settings/ods-template
  loadOdsTemplate(): Observable<FinanceWbsTemplateRow[]> {
    return this.http.get<FinanceWbsTemplateRow[]>(`${this.settingsUrl}/ods-template`);
  }

  // ─── Apply to Projects: liste des projets pour l'onglet "apply" ─
  applyFinanceTemplateToAll(): Observable<ApplyFinanceTemplateResult> {
    return this.http.post<ApplyFinanceTemplateResult>(
      `${this.settingsUrl}/apply-template`,
      { projectIds: undefined }
    );
  }
}