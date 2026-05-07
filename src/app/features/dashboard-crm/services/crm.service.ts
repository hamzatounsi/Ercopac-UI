// Path: src/app/features/dashboard-crm/services/crm.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CrmDashboard }      from '../models/crm-dashboard.model';
import { CrmPipelineStage }  from '../models/crm-pipeline-stage.model';
import { CrmLead }           from '../models/crm-lead.model';
import { CrmOpportunity }    from '../models/crm-opportunity.model';
import { CrmActivity }       from '../models/crm-activity.model';

@Injectable({ providedIn: 'root' })
export class CrmService {

  private base = '/api/crm/organisations';

  constructor(private http: HttpClient) {}

  // ── Helper to get orgId from JWT ──────────────────────────
  getOrgIdFromToken(): number {
    try {
      const token = localStorage.getItem('token')
                 ?? localStorage.getItem('access_token')
                 ?? localStorage.getItem('jwt');
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.organisationId ?? payload.orgId ?? payload.organisation_id ?? 0;
    } catch { return 0; }
  }

  // ══════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════

  getDashboard(orgId: number): Observable<CrmDashboard> {
    return this.http.get<CrmDashboard>(`${this.base}/${orgId}/dashboard`);
  }

  // ══════════════════════════════════════════════════════════
  // PIPELINE STAGES
  // ══════════════════════════════════════════════════════════

  getStages(orgId: number): Observable<CrmPipelineStage[]> {
    return this.http.get<CrmPipelineStage[]>(`${this.base}/${orgId}/stages`);
  }

  createStage(orgId: number, dto: CrmPipelineStage): Observable<CrmPipelineStage> {
    return this.http.post<CrmPipelineStage>(`${this.base}/${orgId}/stages`, dto);
  }

  updateStage(orgId: number, id: number, dto: CrmPipelineStage): Observable<CrmPipelineStage> {
    return this.http.put<CrmPipelineStage>(`${this.base}/${orgId}/stages/${id}`, dto);
  }

  deleteStage(orgId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${orgId}/stages/${id}`);
  }

  // ══════════════════════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════════════════════

  getLeads(orgId: number, search?: string, status?: string): Observable<CrmLead[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (status?.trim()) params = params.set('status', status.trim());
    return this.http.get<CrmLead[]>(`${this.base}/${orgId}/leads`, { params });
  }

  createLead(orgId: number, dto: CrmLead): Observable<CrmLead> {
    return this.http.post<CrmLead>(`${this.base}/${orgId}/leads`, dto);
  }

  updateLead(orgId: number, id: number, dto: CrmLead): Observable<CrmLead> {
    return this.http.put<CrmLead>(`${this.base}/${orgId}/leads/${id}`, dto);
  }

  deleteLead(orgId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${orgId}/leads/${id}`);
  }

  convertLead(orgId: number, leadId: number, stageId: number | null): Observable<CrmOpportunity> {
    return this.http.post<CrmOpportunity>(
      `${this.base}/${orgId}/leads/${leadId}/convert`,
      { stageId }
    );
  }

  // ══════════════════════════════════════════════════════════
  // OPPORTUNITIES
  // ══════════════════════════════════════════════════════════

  getOpportunities(orgId: number, ownerId?: number): Observable<CrmOpportunity[]> {
    let params = new HttpParams();
    if (ownerId) params = params.set('ownerId', ownerId.toString());
    return this.http.get<CrmOpportunity[]>(`${this.base}/${orgId}/opportunities`, { params });
  }

  createOpportunity(orgId: number, dto: CrmOpportunity): Observable<CrmOpportunity> {
    return this.http.post<CrmOpportunity>(`${this.base}/${orgId}/opportunities`, dto);
  }

  updateOpportunity(orgId: number, id: number, dto: CrmOpportunity): Observable<CrmOpportunity> {
    return this.http.put<CrmOpportunity>(`${this.base}/${orgId}/opportunities/${id}`, dto);
  }

  deleteOpportunity(orgId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${orgId}/opportunities/${id}`);
  }

  markWon(orgId: number, id: number): Observable<CrmOpportunity> {
    return this.http.post<CrmOpportunity>(
      `${this.base}/${orgId}/opportunities/${id}/won`, {}
    );
  }

  markLost(orgId: number, id: number): Observable<CrmOpportunity> {
    return this.http.post<CrmOpportunity>(
      `${this.base}/${orgId}/opportunities/${id}/lost`, {}
    );
  }
}