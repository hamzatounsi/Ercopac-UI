import { CrmOpportunity } from './crm-opportunity.model';

export interface CrmAnalyticsStageMetric { name: string; color: string | null; count: number; value: number; }
export interface CrmAnalyticsSourceMetric { name: string; count: number; }
export interface CrmAnalytics {
  opportunityType: string | null;
  totalOpportunities: number;
  pipelineValue: number;
  wonValue: number;
  activeLeads: number;
  pipelineByStage: CrmAnalyticsStageMetric[];
  leadsBySource: CrmAnalyticsSourceMetric[];
  opportunities: CrmOpportunity[];
}
