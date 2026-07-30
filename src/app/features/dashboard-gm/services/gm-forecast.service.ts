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

  getForecastGrid(projectId: number, periods: number): Observable<ForecastRow[]> {
    const params = new HttpParams().set('periods', periods);
    return this.http.get<ForecastRow[]>(`${this.baseUrl}/${projectId}/forecast`, { params });
  }

  getForecastSummary(projectId: number, periods: number): Observable<ForecastSummary> {
    const params = new HttpParams().set('periods', periods);
    return this.http.get<ForecastSummary>(`${this.baseUrl}/${projectId}/forecast/summary`, { params });
  }

  // Updates a single period cell amount for a given WBS row (existing behavior).
  updateForecastCell(projectId: number, payload: {
    wbsCode: string;
    periodKey: string;
    amount: number;
  }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${projectId}/forecast`, payload);
  }

  // Updates a single row-level field (description, budget, actualCost, type)
  // for a given WBS row.
  //
  // NOTE: this assumes a backend endpoint PUT /{projectId}/forecast/row that
  // accepts { wbsCode, field, value }. Adjust the URL/payload shape to match
  // whatever your actual API contract for row-level edits looks like.
  updateForecastRow(projectId: number, payload: {
    wbsCode: string;
    field: 'description' | 'budget' | 'actualCost' | 'type';
    value: string | number;
  }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${projectId}/forecast/row`, payload);
  }
}