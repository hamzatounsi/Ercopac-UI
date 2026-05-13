import { CrmActivity }        from './crm-activity.model';
import { CrmOpportunity }     from './crm-opportunity.model';
import { CrmPipelineStage }   from './crm-pipeline-stage.model';
 
export interface CrmDashboard {
  openOpportunities: number;
  pipelineValue: number | null;
  activeLeads: number;
  wonThisMonth: number;
  recentActivities: CrmActivity[];
  closingThisMonth: CrmOpportunity[];
  leadsBySource: Record<string, number>;
  pipeline: CrmPipelineStage[];
}