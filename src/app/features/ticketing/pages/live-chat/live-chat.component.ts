import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Ticket, TicketDetails, TicketMessage } from '../../models/ticket.models';
import { TicketChatService } from '../../services/ticket-chat.service';
import { TicketService } from '../../services/ticket.service';

// Live chat on ticket conversations: messages arrive through the /ws/tickets websocket,
// with polling as a fallback when the socket is down.
@Component({
  selector: 'app-live-chat',
  templateUrl: './live-chat.component.html',
  styleUrls: ['./live-chat.component.scss']
})
export class LiveChatComponent implements OnInit, OnDestroy {
  @ViewChild('thread') thread?: ElementRef<HTMLDivElement>;

  conversations: Ticket[] = [];
  selected?: TicketDetails;
  search = '';
  showClosed = false;
  message = '';
  internal = false;
  sending = false;
  loading = true;
  error = '';

  private readonly currentUserId = this.auth.getCurrentUserId();
  private listPoll?: Subscription;
  private threadPoll?: Subscription;
  private chatSub?: Subscription;

  constructor(private api: TicketService, private chat: TicketChatService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadConversations();
    this.listPoll = interval(15000).subscribe(() => this.loadConversations(false));
    this.chatSub = this.chat.updates.subscribe(event => {
      if (event?.type === 'message' && this.selected && event.ticketId === this.selected.ticket.id) {
        this.appendMessage(event.message as TicketMessage);
      }
    });
  }

  ngOnDestroy(): void {
    this.listPoll?.unsubscribe();
    this.threadPoll?.unsubscribe();
    this.chatSub?.unsubscribe();
    this.chat.disconnect();
  }

  get filteredConversations(): Ticket[] {
    const term = this.search.trim().toLowerCase();
    return this.conversations
      .filter(t => this.showClosed || !['CLOSED', 'CANCELLED'].includes(t.status))
      .filter(t => !term || [t.ticketNumber, t.subject, t.client?.fullName, t.organisationName]
        .some(v => (v || '').toLowerCase().includes(term)));
  }

  loadConversations(show = true): void {
    if (show) this.loading = true;
    this.api.list({ page: 0, size: 100, sort: 'updatedAt,desc' }).subscribe({
      next: page => {
        this.conversations = [...page.content].sort((a, b) =>
          (b.lastMessageAt || b.updatedAt).localeCompare(a.lastMessageAt || a.updatedAt));
        this.loading = false;
        if (!this.selected && this.filteredConversations.length) this.open(this.filteredConversations[0]);
      },
      error: e => { this.error = e.error?.message || 'Conversations could not be loaded.'; this.loading = false; }
    });
  }

  open(ticket: Ticket): void {
    if (this.selected?.ticket.id === ticket.id) return;
    this.error = '';
    this.message = '';
    this.internal = false;
    this.threadPoll?.unsubscribe();
    this.api.get(ticket.id).subscribe({
      next: details => {
        this.selected = details;
        ticket.unreadCount = 0;
        this.chat.connect(ticket.id);
        this.threadPoll = interval(10000).subscribe(() => this.refreshThread());
        this.scrollToBottom();
      },
      error: e => this.error = e.error?.message || 'Conversation could not be loaded.'
    });
  }

  send(): void {
    const text = this.message.trim();
    if (!text || !this.selected || this.sending) return;
    this.sending = true;
    this.api.message(this.selected.ticket.id, text, this.internal).subscribe({
      next: m => { this.appendMessage(m); this.message = ''; this.sending = false; },
      error: e => { this.error = e.error?.message || 'Message could not be sent.'; this.sending = false; }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  openTicket(): void {
    if (this.selected) void this.router.navigate(['/tickets', this.selected.ticket.id]);
  }

  isMine(m: TicketMessage): boolean { return m.sender?.id === this.currentUserId; }
  isClient(m: TicketMessage): boolean { return !!this.selected && m.sender?.id === this.selected.ticket.client?.id; }
  initials(name?: string): string { return (name || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  label(v: string): string { return v.replace(/_/g, ' '); }
  trackById(_: number, item: { id: number }): number { return item.id; }

  private refreshThread(): void {
    if (!this.selected) return;
    const id = this.selected.ticket.id;
    this.api.get(id).subscribe({
      next: details => {
        if (this.selected?.ticket.id !== id) return;
        const grew = details.messages.length > this.selected.messages.length;
        this.selected = details;
        if (grew) this.scrollToBottom();
      }
    });
  }

  private appendMessage(m: TicketMessage): void {
    if (!this.selected || !m || this.selected.messages.some(x => x.id === m.id)) return;
    this.selected.messages.push(m);
    const conv = this.conversations.find(t => t.id === this.selected?.ticket.id);
    if (conv) conv.lastMessageAt = m.createdAt;
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.thread?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
