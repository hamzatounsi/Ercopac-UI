export interface OwnerAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}