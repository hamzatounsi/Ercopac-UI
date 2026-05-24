export interface RiskItem {
  id: number;
  riskCode: string | null;
  projectId: number | null;
  projectCode: string | null;
  riskType: string;
  state: string;
  description: string;
  inputDate: string | null;
  dueDate: string | null;
  mitigation: string | null;

  // Resource Type — FK relation
  resourceTypeId: number | null;
  resourceTypeCode: string | null;   // display: "ME"
  resourceTypeLabel: string | null;  // display: "Mechanical"
  resourceTypeColour: string | null; // display: "#3b82f6"

  // Owner — FK relation
  ownerUserId: number | null;
  ownerUserName: string | null;
  ownerUserCode: string | null;

  // Keep for backward compat
  ownerDept: string | null;
  owner: string | null;

  wbsCode: string | null;
  impact: string;
  probability: number;
  riskValue: number;
  riskLevel: 'low' | 'med' | 'hi' | 'crit';
  varianceStatus: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
}