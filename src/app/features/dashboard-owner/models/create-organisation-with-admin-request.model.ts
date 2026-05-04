export interface CreateOrganisationWithAdminRequest {
  organisationName: string;
  organisationCode: string;
  country?: string;
  domain?: string;
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

  billingEmail?: string;
  vatNumber?: string;
  paymentMethod?: string;

  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}