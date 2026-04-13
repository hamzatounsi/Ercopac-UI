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

  // ✅ NEW FIELDS (from backend)
  owner?: string;
  cpi?: number;
  percentAc?: number;
}