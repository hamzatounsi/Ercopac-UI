import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Supplier } from '../models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class GmSupplierService {
  private readonly baseUrl = '/api/suppliers';

  constructor(private http: HttpClient) {}

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.baseUrl);
  }

  createSupplier(payload: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(this.baseUrl, payload);
  }

  updateSupplier(id: number, payload: Partial<Supplier>): Observable<Supplier> {
    return this.http.put<Supplier>(`${this.baseUrl}/${id}`, payload);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}