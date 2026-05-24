export interface RiskExposureItem {
  riskId: number;
  riskCode: string;
  description: string;
  riskValue: number;
  riskLevel: string;
}

export interface RiskSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  openRisks: number;
  pendingVariance: number;
  opportunityCount: number;
  riskCount: number;
  netExposureScore: number;
  riskExposureItems: RiskExposureItem[];      // ← ADD
  opportunityItems: RiskExposureItem[];        // ← ADD
}