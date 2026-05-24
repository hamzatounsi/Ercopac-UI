export interface RiskApprovalRule {
  id?: number;
  projectId?: number | null;
  riskLevel: string;
  minRiskValue: number;
  approverRole: string;
  approverUserId?: number | null;
  approverUserName?: string | null;
}

export interface UpsertRiskApprovalRuleRequest {
  riskLevel: string;
  minRiskValue: number;
  approverRole: string;
  approverUserId?: number | null;
}