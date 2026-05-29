import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_PROJECTS_URL } from 'src/app/core/config/api.config';
import { ChangeRequest } from '../models/change-request.model';
import { ChangeRequestSummary } from '../models/change-request-summary.model';
import { HttpResponse } from '@angular/common/http';
import { ChangeRequestAttachment } from '../models/change-request.model';
@Injectable({
  providedIn: 'root'
})
export class GmChangeRequestService {
  private readonly baseUrl = API_PROJECTS_URL;

  constructor(private http: HttpClient) {}

  getRows(projectId: number): Observable<ChangeRequest[]> {
    return this.http.get<ChangeRequest[]>(`${this.baseUrl}/${projectId}/change-requests`);
  }

  getSummary(projectId: number): Observable<ChangeRequestSummary> {
    return this.http.get<ChangeRequestSummary>(`${this.baseUrl}/${projectId}/change-requests/summary`);
  }

  create(projectId: number, payload: any): Observable<ChangeRequest> {
    return this.http.post<ChangeRequest>(`${this.baseUrl}/${projectId}/change-requests`, payload);
  }

  update(projectId: number, id: number, payload: any): Observable<ChangeRequest> {
    return this.http.put<ChangeRequest>(`${this.baseUrl}/${projectId}/change-requests/${id}`, payload);
  }

  delete(projectId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${projectId}/change-requests/${id}`);
  }
  uploadAttachments(projectId: number, crId: number, files: File[]): Observable<ChangeRequestAttachment[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return this.http.post<ChangeRequestAttachment[]>(
    `${this.baseUrl}/${projectId}/change-requests/${crId}/attachments`,
    formData
  );
}

downloadAttachment(projectId: number, crId: number, attachmentId: number): Observable<HttpResponse<Blob>> {
  return this.http.get(
    `${this.baseUrl}/${projectId}/change-requests/${crId}/attachments/${attachmentId}/download`,
    { observe: 'response', responseType: 'blob' }
  );
}

deleteAttachment(projectId: number, crId: number, attachmentId: number): Observable<void> {
  return this.http.delete<void>(
    `${this.baseUrl}/${projectId}/change-requests/${crId}/attachments/${attachmentId}`
  );
}
}