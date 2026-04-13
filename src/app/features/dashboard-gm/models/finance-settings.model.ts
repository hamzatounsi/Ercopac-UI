export type FinanceWbsRowType = 'SUMMARY' | 'HOUR' | 'COST';

export interface FinanceWbsTemplateRow {
  id?: number;
  sortOrder: number;
  level: number;
  codeTemplate: string;
  description: string;
  type: FinanceWbsRowType;
  ownerKey?: string | null;
  hourRate?: number | null;
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