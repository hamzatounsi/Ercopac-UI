import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { environment } from 'src/environments/environment';
import { ChatContact, ChatConversation, ChatMessage } from '../models/ticket.models';

/** Live chat between the current user and another user; new messages are pushed on the /ws/tickets websocket. */
@Injectable({ providedIn: 'root' })
export class DirectChatService {
  private readonly base = `${API_BASE_URL}/tickets/chat`;
  private socket?: WebSocket;
  private active = false;
  private readonly incomingSource = new Subject<ChatMessage>();
  readonly incoming = this.incomingSource.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  contacts(): Observable<ChatContact[]> {
    return this.http.get<ChatContact[]>(`${this.base}/contacts`);
  }

  conversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.base}/conversations`);
  }

  /** Messages with this user; also marks the ones received from them as read. */
  messages(userId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/${userId}/messages`);
  }

  send(userId: number, message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/${userId}/messages`, { message });
  }

  connect(): void {
    this.active = true;
    if (this.socket) return;
    const api = environment.apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
    const token = encodeURIComponent(this.auth.getToken() || '');
    const socket = new WebSocket(`${api}/ws/tickets?token=${token}`);
    socket.onmessage = e => {
      try {
        const event = JSON.parse(e.data);
        if (event?.type === 'direct' && event.message) this.incomingSource.next(event.message as ChatMessage);
      } catch { /* ignore malformed frames */ }
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = undefined;
      if (this.active) setTimeout(() => this.connect(), 5000);
    };
    this.socket = socket;
  }

  disconnect(): void {
    this.active = false;
    this.socket?.close();
    this.socket = undefined;
  }
}
