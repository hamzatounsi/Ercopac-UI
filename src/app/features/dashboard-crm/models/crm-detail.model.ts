export interface CrmSupplyCategory { id: number | null; name: string; displayOrder: number; active: boolean; }
export interface CrmNotificationPreference { emailNotifications: boolean; stageChangeAlerts: boolean; closingDateReminders: boolean; }
export interface CrmIndustry { id: number | null; name: string; active: boolean; createdAt?: string | null; updatedAt?: string | null; }
export interface CrmUser { id: number; name: string; email: string; role: string; }
export interface CrmOpportunityNote { id: number; authorId: number; authorName: string; content: string; createdAt: string; updatedAt: string; }
export interface CrmOpportunityAttachment { id: number; originalFileName: string; contentType: string; fileSize: number; uploadedById: number; uploadedByName: string; uploadedAt: string; }
export interface CrmOpportunityHistory { id: number; fieldName: string; oldValue: string | null; newValue: string | null; changedById: number | null; changedByName: string | null; createdAt: string; }
export interface CrmOpportunityStageHistory { id: number; stageId: number | null; stageName: string; probability: number; closingDate: string | null; modifiedById: number | null; modifiedByName: string | null; enteredAt: string; }
export interface CrmBreakdown { key: string; count: number; value: number; }
export interface CrmReports { totalOpportunities: number; totalValue: number; weightedValue: number; byCountry: CrmBreakdown[]; byStage: CrmBreakdown[]; bySupplyCategory: CrmBreakdown[]; materialValue: number; servicesValue: number; opportunities: import('./crm-opportunity.model').CrmOpportunity[]; }
export interface CrmManagerTeamMember { userId: number; name: string; role: string; opportunityCount: number; pipelineValue: number; wonValue: number; target: number; currency: string; }
export interface CrmManagerView { team: CrmManagerTeamMember[]; opportunities: import('./crm-opportunity.model').CrmOpportunity[]; year: number; }
