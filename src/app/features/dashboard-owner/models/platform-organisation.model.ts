export interface PlatformOrganisation {
  id: number;
  name: string;
  code: string;
  country?: string;
  domain?: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  plan: string;

  warehouseLimit: number;
  userLimit: number;

  adminLicenceLimit: number;
  specialistLicenceLimit: number;
  supervisorLicenceLimit: number;
  operatorLicenceLimit: number;
  readonlyLicenceLimit: number;

  monthlyRevenue: number;
  healthScore: number;
  createdAt?: string;

  billingEmail?: string;
  vatNumber?: string;
  paymentMethod?: string;

  force2faAdmins?: string;
  force2faSpecialists?: string;
  force2faOperators?: string;
  default2faMethod?: string;
  sessionTimeout?: string;
  maxFailedLogins: number;
  passwordMinLength: number;
  passwordExpiry?: string;

  internalNotes?: string;

  flagAtRisk: boolean;
  flagPaymentOverdue: boolean;
  flagUpsellOpportunity: boolean;
  flagVipPriority: boolean;
  flagPilotFeatures: boolean;
  flagUnderReview: boolean;
  adminFullName?: string;
}