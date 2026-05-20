import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PLATFORM_URL } from 'src/app/core/config/api.config';
import { OwnerKpi } from '../models/owner-kpi.model';
import { OwnerOrganisationSummary } from '../models/owner-organisation-summary.model';
import { OwnerProjectRow } from '../models/owner-project-row.model';
import { OwnerAlert } from '../models/owner-alert.model';
import { PlatformOrganisation } from '../models/platform-organisation.model';

@Injectable({
  providedIn: 'root'
})
export class OwnerDashboardService {
  private readonly baseUrl = `${API_PLATFORM_URL}/dashboard`;
  private readonly platformOrgUrl = `${API_PLATFORM_URL}/organisations`;

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

  getPlatformOrganisations(): Observable<PlatformOrganisation[]> {
    return this.http.get<PlatformOrganisation[]>(this.platformOrgUrl);
  }

  getPlatformOrganisation(id: number): Observable<PlatformOrganisation> {
    return this.http.get<PlatformOrganisation>(`${this.platformOrgUrl}/${id}`);
  }

  updatePlatformOrganisation(id: number, body: any): Observable<PlatformOrganisation> {
    return this.http.put<PlatformOrganisation>(`${this.platformOrgUrl}/${id}`, body);
  }

  updatePlatformOrganisationStatus(
    id: number,
    status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
  ): Observable<PlatformOrganisation> {
    return this.http.patch<PlatformOrganisation>(
      `${this.platformOrgUrl}/${id}/status?status=${status}`,
      {}
    );
  }
}