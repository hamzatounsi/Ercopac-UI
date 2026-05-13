export interface CreateOrganisationWithAdminRequest {
  organisationName: string;
  organisationCode: string;
  country?: string;
  domain?: string;
  plan: string;

  userLimit: number;

  orgAdminLicenceLimit: number;
  generalManagerLicenceLimit: number;
  departmentManagerLicenceLimit: number;
  employeeLicenceLimit: number;

  monthlyRevenue: number;
  healthScore: number;

  billingEmail?: string;
  vatNumber?: string;
  paymentMethod?: string;

  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}