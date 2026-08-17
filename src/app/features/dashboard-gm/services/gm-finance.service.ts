import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { FinanceEntry } from '../models/finance-entry.model';
import { FinanceSummary } from '../models/finance-summary.model';
import {
  FinanceSettings,
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

  updateForecastValue(projectId: number, rowId: number, forecast: number): Observable<FinanceEntry> {
    return this.http.patch<FinanceEntry>(
      `${this.baseUrl}/${projectId}/finance/${rowId}/forecast`,
      { forecast }
    );
  }

  // ✅ MODIFIÉ : Passe le projectId pour charger les paramètres spécifiques au projet
  getFinanceSettings(projectId: number): Observable<FinanceSettings> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.get<FinanceSettings>(this.settingsUrl, { params });
  }

  // ✅ MODIFIÉ : Passe le projectId pour sauvegarder les paramètres spécifiques au projet
  saveFinanceSettings(payload: FinanceSettings, projectId: number): Observable<FinanceSettings> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.put<FinanceSettings>(this.settingsUrl, payload, { params });
  }

  // ✅ NOUVEAU : Appliquer le template uniquement au projet actuel
  applyFinanceTemplateToCurrentProject(projectId: number): Observable<ApplyFinanceTemplateResult> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.post<ApplyFinanceTemplateResult>(`${this.settingsUrl}/apply-template`, {}, { params });
  }

  // ✅ MODIFIÉ : Passe le projectId pour l'import spécifique au projet
  importWbsTemplate(
    rows: FinanceWbsTemplateRow[],
    replaceExisting: boolean,
    projectId: number
  ): Observable<FinanceSettings> {
    const params = new HttpParams().set('projectId', projectId.toString());
    return this.http.post<FinanceSettings>(
      `${this.settingsUrl}/import-wbs`,
      { rows, replaceExisting },
      { params }
    );
  }

  loadOdsTemplate(): Observable<FinanceWbsTemplateRow[]> {
    return this.http.get<FinanceWbsTemplateRow[]>(`${this.settingsUrl}/ods-template`);
  }
}