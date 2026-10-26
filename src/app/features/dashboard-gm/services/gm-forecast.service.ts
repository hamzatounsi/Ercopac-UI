import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ForecastRow } from '../models/forecast-row.model';
import { ForecastSummary } from '../models/forecast-summary.model';
import { API_PROJECTS_URL } from 'src/app/core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GmForecastService {
  private readonly baseUrl = API_PROJECTS_URL;

  constructor(private http: HttpClient) {}

  getForecastGrid(projectId: number, periods: number, periodType: string = 'month'): Observable<ForecastRow[]> {
    const params = new HttpParams()
      .set('periods', periods.toString())
      .set('periodType', periodType);
    return this.http.get<ForecastRow[]>(`${this.baseUrl}/${projectId}/forecast`, { params });
  }

  getForecastSummary(projectId: number, periods: number): Observable<ForecastSummary> {
    const params = new HttpParams().set('periods', periods.toString());
    return this.http.get<ForecastSummary>(`${this.baseUrl}/${projectId}/forecast/summary`, { params });
  }

  updateForecastCell(projectId: number, payload: {
    financeEntryId: number;
    wbsCode: string;
    periodKey: string;
    amount: number;
  }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${projectId}/forecast`, payload);
  }

  /** Deletes every forecast value of one WBS row; the Finance WBS node is kept. */
  deleteForecastEntry(projectId: number, financeEntryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/forecast/${financeEntryId}`);
  }

  // ✅ NOUVELLE MÉTHODE : Mettre à jour le lien WBS Schedule
  updateLinkedScheduleWbs(projectId: number, financeEntryId: number, linkedScheduleWbs: string | null): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${projectId}/forecast/linked-wbs`, { 
      financeEntryId, 
      linkedScheduleWbs 
    });
  }
}
