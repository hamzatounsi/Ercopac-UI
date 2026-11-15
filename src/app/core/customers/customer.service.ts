import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CUSTOMERS_URL, API_ORG_ADMIN_CUSTOMERS_URL } from '../config/api.config';
import { Customer, CustomerListQuery, CustomerOption, CustomerPage, SaveCustomerRequest } from './customer.models';

/**
 * Customers of the signed-in user's organisation.
 * - Customer Management (ORG_ADMIN): list / get / create / update / status / delete.
 * - Dropdowns (any role that picks a customer): options(), active customers only.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly manageUrl = API_ORG_ADMIN_CUSTOMERS_URL;
  private readonly optionsUrl = `${API_CUSTOMERS_URL}/options`;

  constructor(private readonly http: HttpClient) {}

  list(query: CustomerListQuery = {}): Observable<CustomerPage> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 20)
      .set('sort', query.sort ?? 'name')
      .set('direction', query.direction ?? 'asc');
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.active !== null && query.active !== undefined) params = params.set('active', query.active);
    return this.http.get<CustomerPage>(this.manageUrl, { params });
  }

  get(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.manageUrl}/${id}`);
  }

  create(request: SaveCustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(this.manageUrl, request);
  }

  update(id: number, request: SaveCustomerRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.manageUrl}/${id}`, request);
  }

  setActive(id: number, active: boolean): Observable<Customer> {
    return this.http.patch<Customer>(`${this.manageUrl}/${id}/status`, { active });
  }

  /** 409 CUSTOMER_IN_USE (with reference counts) when the customer is still referenced. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.manageUrl}/${id}`);
  }

  /**
   * Active customers for a dropdown. includeId adds the record's current customer even when it
   * was deactivated, so an edit form can still display it.
   */
  options(search?: string | null, includeId?: number | null): Observable<CustomerOption[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    if (includeId !== null && includeId !== undefined) params = params.set('includeId', includeId);
    return this.http.get<CustomerOption[]>(this.optionsUrl, { params });
  }
}
