export interface MilestoneType {
  id: number;
  code: string;       // e.g., "FAT", "SP"
  label: string;      // e.g., "SPEDIZIONE"
  color: string;      // e.g., "#FFD700"
  letterCode: string; // e.g., "SP"
  active: boolean;
}

export interface CreateMilestoneTypeRequest {
  code: string;
  label: string;
  color: string;
  letterCode: string;
}