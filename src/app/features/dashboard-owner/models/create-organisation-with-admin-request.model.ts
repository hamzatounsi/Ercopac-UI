export interface CreateOrganisationWithAdminRequest {
  organisationName: string;
  organisationCode: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}