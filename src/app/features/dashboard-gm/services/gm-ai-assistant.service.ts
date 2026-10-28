import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiProjectResponse } from '../models/ai-project-response.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GmAiAssistantService {
  // Use the configured API host. A relative /api URL targets the Angular dev
  // server when its proxy is not enabled, which results in a misleading 404.
  private readonly baseUrl = `${API_BASE_URL}/ai`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  askProjectAssistant(projectId: number, question: string): Observable<AiProjectResponse> {
    return this.http.post<AiProjectResponse>(`${this.baseUrl}/project-assistant/ask`, {
      projectId,
      question
    });
  }

  streamProjectAssistant(projectId: number, question: string): Observable<string> {
    return new Observable<string>(observer => {
      const controller = new AbortController();
      (async () => {
        const token = this.auth.getToken();
        if (!token) throw new Error('Please sign in again.');
        const response = await fetch(`${this.baseUrl}/project-assistant/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ projectId, question }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(response.status === 403 ? 'You cannot access this project.' : `AI request failed (${response.status}).`);
        if (!response.body) throw new Error('Streaming is unavailable in this browser.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        let answer = '';
        let completed = false;
        while (true) {
          const { value, done } = await reader.read();
          pending += decoder.decode(value || new Uint8Array(), { stream: !done });
          const lines = pending.split('\n');
          pending = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.error) throw new Error(event.error);
            if (event.token) { answer += event.token; observer.next(answer); }
            if (Object.prototype.hasOwnProperty.call(event, 'done')) completed = true;
          }
          if (done) break;
        }
        if (!completed) throw new Error('AI response was interrupted. Please retry.');
        observer.complete();
      })().catch(error => { if (!controller.signal.aborted) observer.error(error); });
      return () => controller.abort();
    });
  }
}
