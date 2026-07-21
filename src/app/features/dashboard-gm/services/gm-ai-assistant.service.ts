import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiProjectResponse } from '../models/ai-project-response.model';
import { API_BASE_URL } from '../../../core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GmAiAssistantService {
  // Use the configured API host. A relative /api URL targets the Angular dev
  // server when its proxy is not enabled, which results in a misleading 404.
  private readonly baseUrl = `${API_BASE_URL}/ai`;

  constructor(private http: HttpClient) {}

  askProjectAssistant(projectId: number, question: string): Observable<AiProjectResponse> {
    return this.http.post<AiProjectResponse>(`${this.baseUrl}/project-assistant/ask`, {
      projectId,
      question
    });
  }
}
