export interface CreateOrganisationWithAdminRequest {
  organisationName: string;
  organisationCode: string;
  country?: string;
  domain?: string;
  plan: string;

  userLimit: number;

  orgAdminLicenceLimit: number;
  projectManagerLicenceLimit: number;
  departmentManagerLicenceLimit: number;
  employeeLicenceLimit: number;
  salesManagerLicenceLimit: number;
  clientLicenceLimit: number;

  monthlyRevenue: number;
  healthScore: number;

  billingEmail?: string;
  vatNumber?: string;
  paymentMethod?: string;

  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}
