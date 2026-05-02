import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { CreateOrganisationWithAdminRequest } from '../models/create-organisation-with-admin-request.model';
import { CreateOrganisationWithAdminResponse } from '../models/create-organisation-with-admin-response.model';

@Injectable({ providedIn: 'root' })
export class PlatformOrganisationService {
  private baseUrl = `${API_BASE_URL}/api/platform/organisations`;

  constructor(private http: HttpClient) {}

  createOrganisationWithAdmin(
    payload: CreateOrganisationWithAdminRequest
  ): Observable<CreateOrganisationWithAdminResponse> {
    return this.http.post<CreateOrganisationWithAdminResponse>(this.baseUrl, payload);
  }
}