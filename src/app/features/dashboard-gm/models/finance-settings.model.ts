export type FinanceWbsRowType = 'SUMMARY' | 'HOUR' | 'EXPENSES' | 'COST';

export interface FinanceWbsTemplateRow {
  id?: number;
  sortOrder: number;
  level: number;
  codeTemplate: string;
  description: string;
  type: FinanceWbsRowType;
  
  // Department fields
  departmentId?: number | null;
  departmentName?: string | null;
  
  // Owner fields
  ownerId?: number | null;
  ownerName?: string | null;
  
  // Keep for backward compatibility
  ownerKey?: string | null;
  hourRate?: number | null;
}

// ✅ FIXED: Changed 'name' to 'label' to match the backend Department entity
export interface Department {
  id: number;
  label: string; 
  code: string;
}

export interface AppUser {
  id: number;
  fullName: string;
  email: string;
  departmentId?: number;
  departmentName?: string;
}

export interface FinanceOwnerMapping {
  id?: number;
  ownerKey: string;
  resourceType: string;
  roleFilter?: string | null;
  notes?: string | null;
}

export interface FinanceHourlyRate {
  id?: number;
  resourceType: string;
  hourlyRate: number;
}

export interface FinanceSettings {
  defaultHourlyRate: number;
  templateRows: FinanceWbsTemplateRow[];
  ownerMappings: FinanceOwnerMapping[];
  hourlyRates: FinanceHourlyRate[];
}

export interface ApplyFinanceTemplateRequest {
  projectIds?: number[];
}

export interface ApplyFinanceTemplateResult {
  projectsProcessed: number;
  rowsGenerated: number;
}

export interface FinanceSummary {
  totalSales: number;
  totalBudget: number;
  totalCommitment: number;
  totalActualCost: number;
  totalForecast: number;
  totalEac: number;
  totalVariance: number;
}