export interface CustomerReferences {
  projects: number;
  tickets: number;
  ticketingRecords: number;
}

export interface Customer {
  id: number;
  customerCode: string;
  name: string;
  country: string | null;
  town: string | null;
  address: string | null;
  vatTaxId: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  erpId: string | null;
  active: boolean;
  organisationId: number;
  organisationName: string;
  references: CustomerReferences;
}

/** Create / update payload. The organisation is always the signed-in administrator's one. */
export interface SaveCustomerRequest {
  customerCode: string | null;
  name: string;
  country: string | null;
  town: string | null;
  address: string | null;
  vatTaxId: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  erpId: string | null;
  active: boolean;
}

export interface CustomerOption {
  id: number;
  code: string;
  name: string;
  /** False only for the requested current value of a record (deactivated customer). */
  active: boolean;
}

export type CustomerSortKey = 'name' | 'customerCode' | 'country' | 'town' | 'contactPerson' | 'active';

export interface CustomerListQuery {
  search?: string;
  active?: boolean | null;
  page?: number;
  size?: number;
  sort?: CustomerSortKey;
  direction?: 'asc' | 'desc';
}

export interface CustomerPage {
  content: Customer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function totalReferences(references: CustomerReferences | null | undefined): number {
  return references ? references.projects + references.tickets + references.ticketingRecords : 0;
}
