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
}