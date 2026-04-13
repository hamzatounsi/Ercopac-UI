import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OwnerKpi } from '../models/owner-kpi.model';
import { OwnerOrganisationSummary } from '../models/owner-organisation-summary.model';
import { OwnerProjectRow } from '../models/owner-project-row.model';
import { OwnerAlert } from '../models/owner-alert.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerDashboardService {
  private readonly baseUrl = 'http://localhost:8087/api/platform/dashboard';

  constructor(private http: HttpClient) {}

  getKpis(): Observable<OwnerKpi> {
    return this.http.get<OwnerKpi>(`${this.baseUrl}/kpis`);
  }

  getOrganisations(): Observable<OwnerOrganisationSummary[]> {
    return this.http.get<OwnerOrganisationSummary[]>(`${this.baseUrl}/organisations`);
  }

  getProjects(): Observable<OwnerProjectRow[]> {
    return this.http.get<OwnerProjectRow[]>(`${this.baseUrl}/projects`);
  }

  getAlerts(): Observable<OwnerAlert[]> {
    return this.http.get<OwnerAlert[]>(`${this.baseUrl}/alerts`);
  }
}