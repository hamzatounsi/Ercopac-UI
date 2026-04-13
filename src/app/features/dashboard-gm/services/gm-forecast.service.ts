import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ForecastRow } from '../models/forecast-row.model';
import { ForecastSummary } from '../models/forecast-summary.model';

@Injectable({
  providedIn: 'root'
})
export class GmForecastService {
  private readonly baseUrl = 'http://localhost:8087/api/projects';

  constructor(private http: HttpClient) {}

  getForecastGrid(projectId: number, periods: number): Observable<ForecastRow[]> {
    const params = new HttpParams().set('periods', periods);
    return this.http.get<ForecastRow[]>(`${this.baseUrl}/${projectId}/forecast`, { params });
  }

  getForecastSummary(projectId: number, periods: number): Observable<ForecastSummary> {
    const params = new HttpParams().set('periods', periods);
    return this.http.get<ForecastSummary>(`${this.baseUrl}/${projectId}/forecast/summary`, { params });
  }

  updateForecastCell(projectId: number, payload: {
    wbsCode: string;
    periodKey: string;
    amount: number;
  }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${projectId}/forecast`, payload);
  }
}