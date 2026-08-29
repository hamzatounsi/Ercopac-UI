import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CrmDashboard } from '../models/crm-dashboard.model';
import { CrmPipelineStage } from '../models/crm-pipeline-stage.model';
import { CrmLead } from '../models/crm-lead.model';
import { CrmOpportunity } from '../models/crm-opportunity.model';
import { CrmAccount } from '../models/crm-account.model';
import { CrmAnalytics } from '../models/crm-analytics.model';
import { CrmManagerTeamMember, CrmManagerView, CrmOpportunityAttachment, CrmOpportunityHistory,
  CrmOpportunityNote, CrmOpportunityStageHistory, CrmReports, CrmSupplyCategory, CrmUser, CrmNotificationPreference, CrmIndustry } from '../models/crm-detail.model';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private base = `${environment.apiUrl}/crm/organisations`;
  constructor(private http: HttpClient, private auth: AuthService) {}

  getOrgIdFromToken(): number { return this.auth.getOrganisationId() ?? 0; }
  private url(orgId: number): string { return `${this.base}/${orgId}`; }

  getDashboard(orgId: number): Observable<CrmDashboard> { return this.http.get<CrmDashboard>(`${this.url(orgId)}/dashboard`); }
  getReports(orgId: number): Observable<CrmReports> { return this.http.get<CrmReports>(`${this.url(orgId)}/reports`); }
  getAnalytics(orgId: number, opportunityType?: string): Observable<CrmAnalytics> {
    let params = new HttpParams();
    if (opportunityType) params = params.set('opportunityType', opportunityType);
    return this.http.get<CrmAnalytics>(`${this.url(orgId)}/analytics`, { params });
  }
  getCrmUsers(orgId: number): Observable<CrmUser[]> { return this.http.get<CrmUser[]>(`${this.url(orgId)}/users`); }
  getNotificationPreferences(orgId: number): Observable<CrmNotificationPreference> { return this.http.get<CrmNotificationPreference>(`${this.url(orgId)}/notification-preferences`); }
  saveNotificationPreferences(orgId: number, dto: CrmNotificationPreference): Observable<CrmNotificationPreference> { return this.http.put<CrmNotificationPreference>(`${this.url(orgId)}/notification-preferences`, dto); }
  getOpportunityTeamUsers(orgId: number): Observable<CrmUser[]> { return this.http.get<CrmUser[]>(`${this.url(orgId)}/opportunities/team-users`); }

  getAccounts(orgId: number, search?: string): Observable<CrmAccount[]> {
    let params = new HttpParams(); if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<CrmAccount[]>(`${this.url(orgId)}/accounts`, { params });
  }
  getAccount(orgId: number, id: number): Observable<CrmAccount> { return this.http.get<CrmAccount>(`${this.url(orgId)}/accounts/${id}`); }
  createAccount(orgId: number, dto: CrmAccount): Observable<CrmAccount> { return this.http.post<CrmAccount>(`${this.url(orgId)}/accounts`, dto); }
  updateAccount(orgId: number, id: number, dto: CrmAccount): Observable<CrmAccount> { return this.http.put<CrmAccount>(`${this.url(orgId)}/accounts/${id}`, dto); }
  deleteAccount(orgId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/accounts/${id}`); }
  getIndustries(orgId: number, includeInactive = false): Observable<CrmIndustry[]> {
    const params = includeInactive ? new HttpParams().set('includeInactive', 'true') : undefined;
    return this.http.get<CrmIndustry[]>(`${this.url(orgId)}/industries`, { params });
  }
  createIndustry(orgId: number, dto: CrmIndustry): Observable<CrmIndustry> { return this.http.post<CrmIndustry>(`${this.url(orgId)}/industries`, dto); }
  updateIndustry(orgId: number, id: number, dto: CrmIndustry): Observable<CrmIndustry> { return this.http.put<CrmIndustry>(`${this.url(orgId)}/industries/${id}`, dto); }
  deleteIndustry(orgId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/industries/${id}`); }

  getStages(orgId: number): Observable<CrmPipelineStage[]> { return this.http.get<CrmPipelineStage[]>(`${this.url(orgId)}/stages`); }
  createStage(orgId: number, dto: CrmPipelineStage): Observable<CrmPipelineStage> { return this.http.post<CrmPipelineStage>(`${this.url(orgId)}/stages`, dto); }
  updateStage(orgId: number, id: number, dto: CrmPipelineStage): Observable<CrmPipelineStage> { return this.http.put<CrmPipelineStage>(`${this.url(orgId)}/stages/${id}`, dto); }
  deleteStage(orgId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/stages/${id}`); }

  getOrganisationCategories(orgId: number): Observable<CrmSupplyCategory[]> { return this.http.get<CrmSupplyCategory[]>(`${this.url(orgId)}/categories`); }

  getLeads(orgId: number, search?: string, status?: string, accountId?: number): Observable<CrmLead[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (status?.trim()) params = params.set('status', status.trim());
    if (accountId) params = params.set('accountId', accountId);
    return this.http.get<CrmLead[]>(`${this.url(orgId)}/leads`, { params });
  }
  getLead(orgId: number, id: number): Observable<CrmLead> { return this.http.get<CrmLead>(`${this.url(orgId)}/leads/${id}`); }
  createLead(orgId: number, dto: CrmLead): Observable<CrmLead> { return this.http.post<CrmLead>(`${this.url(orgId)}/leads`, dto); }
  updateLead(orgId: number, id: number, dto: CrmLead): Observable<CrmLead> { return this.http.put<CrmLead>(`${this.url(orgId)}/leads/${id}`, dto); }
  deleteLead(orgId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/leads/${id}`); }
  convertLead(orgId: number, leadId: number, stageId: number | null): Observable<CrmOpportunity> {
    return this.http.post<CrmOpportunity>(`${this.url(orgId)}/leads/${leadId}/convert`, { stageId });
  }

  getOpportunities(orgId: number, filters: { ownerId?: number; accountId?: number; leadId?: number; stageId?: number } = {}): Observable<CrmOpportunity[]> {
    let params = new HttpParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params = params.set(key, value); });
    return this.http.get<CrmOpportunity[]>(`${this.url(orgId)}/opportunities`, { params });
  }
  getOpportunity(orgId: number, id: number): Observable<CrmOpportunity> { return this.http.get<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}`); }
  createOpportunity(orgId: number, dto: CrmOpportunity): Observable<CrmOpportunity> { return this.http.post<CrmOpportunity>(`${this.url(orgId)}/opportunities`, dto); }
  updateOpportunity(orgId: number, id: number, dto: CrmOpportunity): Observable<CrmOpportunity> { return this.http.put<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}`, dto); }
  updateOpportunityTeam(orgId: number, id: number, userIds: number[]): Observable<CrmOpportunity> {
    return this.http.put<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}/team`, { userIds });
  }
  changeStage(orgId: number, id: number, stageId: number): Observable<CrmOpportunity> { return this.http.patch<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}/stage`, { stageId }); }
  deleteOpportunity(orgId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/opportunities/${id}`); }
  markWon(orgId: number, id: number): Observable<CrmOpportunity> { return this.http.post<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}/won`, {}); }
  markLost(orgId: number, id: number): Observable<CrmOpportunity> { return this.http.post<CrmOpportunity>(`${this.url(orgId)}/opportunities/${id}/lost`, {}); }

  getNotes(orgId: number, id: number): Observable<CrmOpportunityNote[]> { return this.http.get<CrmOpportunityNote[]>(`${this.url(orgId)}/opportunities/${id}/notes`); }
  addNote(orgId: number, id: number, content: string): Observable<CrmOpportunityNote> { return this.http.post<CrmOpportunityNote>(`${this.url(orgId)}/opportunities/${id}/notes`, { content }); }
  updateNote(orgId: number, id: number, noteId: number, content: string): Observable<CrmOpportunityNote> { return this.http.put<CrmOpportunityNote>(`${this.url(orgId)}/opportunities/${id}/notes/${noteId}`, { content }); }
  deleteNote(orgId: number, id: number, noteId: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/opportunities/${id}/notes/${noteId}`); }
  getAttachments(orgId: number, id: number): Observable<CrmOpportunityAttachment[]> { return this.http.get<CrmOpportunityAttachment[]>(`${this.url(orgId)}/opportunities/${id}/attachments`); }
  uploadAttachment(orgId: number, id: number, file: File): Observable<CrmOpportunityAttachment> {
    const body = new FormData(); body.append('file', file); return this.http.post<CrmOpportunityAttachment>(`${this.url(orgId)}/opportunities/${id}/attachments`, body);
  }
  downloadAttachment(orgId: number, id: number, attachmentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.url(orgId)}/opportunities/${id}/attachments/${attachmentId}`, { observe: 'response', responseType: 'blob' });
  }
  deleteAttachment(orgId: number, id: number, attachmentId: number): Observable<void> { return this.http.delete<void>(`${this.url(orgId)}/opportunities/${id}/attachments/${attachmentId}`); }
  getHistory(orgId: number, id: number): Observable<CrmOpportunityHistory[]> { return this.http.get<CrmOpportunityHistory[]>(`${this.url(orgId)}/opportunities/${id}/history`); }
  getStageHistory(orgId: number, id: number): Observable<CrmOpportunityStageHistory[]> { return this.http.get<CrmOpportunityStageHistory[]>(`${this.url(orgId)}/opportunities/${id}/stage-history`); }

  getManagerView(orgId: number, year: number): Observable<CrmManagerView> { return this.http.get<CrmManagerView>(`${this.url(orgId)}/manager`, { params: { year } }); }
  saveTarget(orgId: number, userId: number, year: number, amount: number, currency = 'EUR'): Observable<CrmManagerTeamMember> {
    return this.http.put<CrmManagerTeamMember>(`${this.url(orgId)}/manager/targets/${userId}`, { amount, currency }, { params: { year } });
  }
}
