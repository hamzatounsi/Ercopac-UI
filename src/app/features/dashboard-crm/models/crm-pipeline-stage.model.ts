
export interface CrmPipelineStage {
  id: number | null;
  name: string;
  color: string;
  displayOrder: number;
  probability: number;
  won: boolean;
  lost: boolean;
  opportunityCount: number;
}
 
export function emptyStage(): CrmPipelineStage {
  return { id: null, name: '', color: '#3b82f6', displayOrder: 0, probability: 0, won: false, lost: false, opportunityCount: 0 };
}
 
