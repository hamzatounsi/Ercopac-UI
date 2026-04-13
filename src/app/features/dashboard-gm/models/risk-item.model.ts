export interface RiskItem {
  id: number;
  riskType: string;
  state: string;
  description: string;
  inputDate: string | null;
  dueDate: string | null;
  mitigation: string | null;
  ownerDept: string | null;
  owner: string | null;
  wbsCode: string | null;
  impact: number;
  probability: number;
  riskValue: number;
  riskLevel: 'low' | 'med' | 'hi' | 'crit';
  varianceStatus: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
}