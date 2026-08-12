export type FinanceWbsRowType = 'SUMMARY' | 'HOUR' | 'EXPENSES' | 'COST';

export interface FinanceWbsTemplateRow {
  id?: number;
  sortOrder: number;
  level: number;
  codeTemplate: string;
  description: string;
  type: FinanceWbsRowType;
  
  departmentId?: number | null;
  departmentName?: string | null;
  
  ownerId?: number | null;
  ownerName?: string | null;
  
  ownerKey?: string | null;
  hourRate?: number | null;
  
  resourceType?: string | null; // ✅ AJOUTÉ : Pour lier au taux par défaut
}

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

// ✅ NETTOYÉ : Suppression de FinanceOwnerMapping et FinanceHourlyRate
export interface FinanceSettings {
  defaultHourlyRate: number;
  templateRows: FinanceWbsTemplateRow[];
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

export interface FinanceEntry {
  id: number;
  wbsCode: string;
  description: string;
  level: number;
  sales: number;
  budget: number;
  commitment: number;
  actualCost: number;
  forecast: number;
  eac: number;
  variance: number;
  owner?: string;
  cpi?: number;
  percentAc?: number;
}