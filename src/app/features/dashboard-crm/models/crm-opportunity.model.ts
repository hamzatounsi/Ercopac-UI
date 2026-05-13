
export interface CrmOpportunity {
  id: number | null;
  name: string;
  accountName: string | null;
  stageId: number | null;
  stageName: string | null;
  stageColor: string | null;
  value: number | null;
  currency: string;
  probability: number;
  closingDate: string | null;
  ownerId: number | null;
  ownerName: string | null;
  leadId: number | null;
  won: boolean;
  lost: boolean;
  notes: string | null;
  createdAt: string | null;
}
 
export function emptyOpportunity(): CrmOpportunity {
  return {
    id: null, name: '', accountName: '', stageId: null, stageName: null,
    stageColor: null, value: null, currency: 'EUR', probability: 0,
    closingDate: null, ownerId: null, ownerName: null, leadId: null,
    won: false, lost: false, notes: '', createdAt: null
  };
}