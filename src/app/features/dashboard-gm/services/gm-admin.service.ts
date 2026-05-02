import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_ADMIN_URL } from 'src/app/core/config/api.config';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GmAdminService {

  constructor(private http: HttpClient) {}

  // LICENCES
  getLicences(): Observable<any[]> {
    return this.http.get<any[]>(`${API_ADMIN_URL}/licences`);
  }

  assignLicence(payload: any): Observable<any> {
    return this.http.post(`${API_ADMIN_URL}/licences`, payload);
  }

  removeLicence(userId: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN_URL}/licences/${userId}`);
  }

  // CATEGORIES
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${API_ADMIN_URL}/categories`);
  }

  createCategory(payload: any): Observable<any> {
    return this.http.post(`${API_ADMIN_URL}/categories`, payload);
  }

  updateCategory(id: number, payload: any): Observable<any> {
    return this.http.put(`${API_ADMIN_URL}/categories/${id}`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN_URL}/categories/${id}`);
  }

  // TYPES
  getTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${API_ADMIN_URL}/types`);
  }

  createType(payload: any): Observable<any> {
    return this.http.post(`${API_ADMIN_URL}/types`, payload);
  }

  updateType(id: number, payload: any): Observable<any> {
    return this.http.put(`${API_ADMIN_URL}/types/${id}`, payload);
  }

  deleteType(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN_URL}/types/${id}`);
  }

  // CUSTOMERS
  getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${API_ADMIN_URL}/customers`);
  }

  createCustomer(payload: any): Observable<any> {
    return this.http.post(`${API_ADMIN_URL}/customers`, payload);
  }

  updateCustomer(id: number, payload: any): Observable<any> {
    return this.http.put(`${API_ADMIN_URL}/customers/${id}`, payload);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN_URL}/customers/${id}`);
  }
}