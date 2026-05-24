import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RiskItem } from '../models/risk-item.model';
import { RiskSummary } from '../models/risk-summary.model';
import { API_PROJECTS_URL } from 'src/app/core/config/api.config';
import { RiskApprovalRule, UpsertRiskApprovalRuleRequest } from '../models/risk-approval-rule.model';
import { ResourceTypeDto } from '../models/resource-type.model';
@Injectable({
  providedIn: 'root'
})
export class GmRiskService {
  private readonly baseUrl = API_PROJECTS_URL;

  constructor(private http: HttpClient) {}

  getRisks(projectId: number): Observable<RiskItem[]> {
    return this.http.get<RiskItem[]>(`${this.baseUrl}/${projectId}/risks`);
  }

  getSummary(projectId: number): Observable<RiskSummary> {
    return this.http.get<RiskSummary>(`${this.baseUrl}/${projectId}/risks/summary`);
  }

  createRisk(projectId: number, payload: any): Observable<RiskItem> {
    return this.http.post<RiskItem>(`${this.baseUrl}/${projectId}/risks`, payload);
  }

  updateRisk(projectId: number, riskId: number, payload: any): Observable<RiskItem> {
    return this.http.put<RiskItem>(`${this.baseUrl}/${projectId}/risks/${riskId}`, payload);
  }

  deleteRisk(projectId: number, riskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/risks/${riskId}`);
  }

getAllPendingApprovals(): Observable<RiskItem[]> {
  return this.http.get<RiskItem[]>(`http://localhost:8087/api/risks/pending-approvals`);
}

  approveRisk(projectId: number, riskId: number): Observable<RiskItem> {
    return this.http.post<RiskItem>(`${this.baseUrl}/${projectId}/risks/${riskId}/approve`, {});
  }

  rejectRisk(projectId: number, riskId: number): Observable<RiskItem> {
    return this.http.post<RiskItem>(`${this.baseUrl}/${projectId}/risks/${riskId}/reject`, {});
  }
  getApprovalRules(projectId: number): Observable<RiskApprovalRule[]> {
  return this.http.get<RiskApprovalRule[]>(
    `http://localhost:8087/api/projects/${projectId}/risks/approval-rules`
  );
}

createApprovalRule(projectId: number, payload: UpsertRiskApprovalRuleRequest): Observable<RiskApprovalRule> {
  return this.http.post<RiskApprovalRule>(
    `http://localhost:8087/api/projects/${projectId}/risks/approval-rules`,
    payload
  );
}

updateApprovalRule(projectId: number, ruleId: number, payload: UpsertRiskApprovalRuleRequest): Observable<RiskApprovalRule> {
  return this.http.put<RiskApprovalRule>(
    `http://localhost:8087/api/projects/${projectId}/risks/approval-rules/${ruleId}`,
    payload
  );
}

deleteApprovalRule(projectId: number, ruleId: number): Observable<void> {
  return this.http.delete<void>(
    `http://localhost:8087/api/projects/${projectId}/risks/approval-rules/${ruleId}`
  );
}
// Returns ResourceTypeDto[] not string[]
getResourceTypes(projectId: number): Observable<ResourceTypeDto[]> {
  return this.http.get<ResourceTypeDto[]>(
    `${this.baseUrl}/${projectId}/risks/resource-types`
  );
}

// Takes resourceTypeId (number) not string
getUsersByResourceType(projectId: number, resourceTypeId: number): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.baseUrl}/${projectId}/risks/users-by-resource-type`,
    { params: { resourceTypeId: resourceTypeId.toString() } }
  );
}

getWbsCodes(projectId: number): Observable<string[]> {
  return this.http.get<string[]>(
    `${this.baseUrl}/${projectId}/risks/wbs-codes`
  );
}
}