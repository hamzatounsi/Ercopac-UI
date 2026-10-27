import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatContact, ChatConversation, ChatMessage } from '../../models/ticket.models';
import { DirectChatService } from '../../services/direct-chat.service';

// Live chat: one-to-one conversations between the current user and another user.
// New messages arrive through the /ws/tickets websocket, with polling as a fallback.
@Component({
  selector: 'app-live-chat',
  templateUrl: './live-chat.component.html',
  styleUrls: ['./live-chat.component.scss']
})
export class LiveChatComponent implements OnInit, OnDestroy {
  @ViewChild('thread') thread?: ElementRef<HTMLDivElement>;

  conversations: ChatConversation[] = [];
  contacts: ChatContact[] = [];
  partner?: ChatContact;
  messages: ChatMessage[] = [];
  search = '';
  picking = false;
  contactSearch = '';
  message = '';
  sending = false;
  loading = true;
  error = '';

  readonly currentUserId = this.auth.getCurrentUserId();
  readonly isStaff = this.auth.hasAnyRole(['SALES_MANAGER_LEAD', 'H24', 'H24_LEAD']);
  private poll?: Subscription;
  private incomingSub?: Subscription;

  constructor(private chat: DirectChatService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadConversations();
    this.chat.contacts().subscribe({ next: c => this.contacts = c, error: () => this.contacts = [] });
    this.chat.connect();
    this.incomingSub = this.chat.incoming.subscribe(m => this.onIncoming(m));
    this.poll = interval(15000).subscribe(() => { this.loadConversations(false); this.refreshThread(); });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
    this.incomingSub?.unsubscribe();
    this.chat.disconnect();
  }

  get filteredConversations(): ChatConversation[] {
    const term = this.search.trim().toLowerCase();
    return this.conversations.filter(c => !term || c.contact.fullName.toLowerCase().includes(term));
  }

  get filteredContacts(): ChatContact[] {
    const term = this.contactSearch.trim().toLowerCase();
    return this.contacts.filter(c => !term || `${c.fullName} ${c.email}`.toLowerCase().includes(term));
  }

  loadConversations(show = true): void {
    if (show) this.loading = true;
    this.chat.conversations().subscribe({
      next: list => {
        this.conversations = list.map(c => c.contact.id === this.partner?.id ? { ...c, unread: 0 } : c);
        this.loading = false;
      },
      error: e => { this.error = e.error?.message || 'Conversations could not be loaded.'; this.loading = false; }
    });
  }

  startChat(contact: ChatContact): void {
    this.picking = false;
    this.contactSearch = '';
    this.open(contact);
  }

  open(contact: ChatContact): void {
    this.partner = contact;
    this.messages = [];
    this.message = '';
    this.error = '';
    const conv = this.conversations.find(c => c.contact.id === contact.id);
    if (conv) conv.unread = 0;
    this.chat.messages(contact.id).subscribe({
      next: list => { if (this.partner?.id === contact.id) { this.messages = list; this.scrollToBottom(); } },
      error: e => this.error = e.error?.message || 'Conversation could not be loaded.'
    });
  }

  send(): void {
    const text = this.message.trim();
    if (!text || !this.partner || this.sending) return;
    this.sending = true;
    this.chat.send(this.partner.id, text).subscribe({
      next: m => { this.message = ''; this.sending = false; this.onIncoming(m); },
      error: e => { this.error = e.error?.message || 'Message could not be sent.'; this.sending = false; }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  isMine(m: ChatMessage): boolean { return m.senderId === this.currentUserId; }
  initials(name?: string): string { return (name || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  trackById(_: number, item: { id: number }): number { return item.id; }
  trackByContact(_: number, item: ChatConversation): number { return item.contact.id; }

  private onIncoming(m: ChatMessage): void {
    const partnerId = m.senderId === this.currentUserId ? m.recipientId : m.senderId;
    const openHere = this.partner?.id === partnerId;
    if (openHere && !this.messages.some(x => x.id === m.id)) {
      this.messages.push(m);
      this.scrollToBottom();
    }
    const existing = this.conversations.find(c => c.contact.id === partnerId);
    if (existing) {
      if (existing.lastMessageAt === m.createdAt && existing.lastMessage === m.message) return;
      const updated = { ...existing, lastMessage: m.message, lastMessageAt: m.createdAt, lastFromMe: m.senderId === this.currentUserId,
        unread: openHere || m.senderId === this.currentUserId ? 0 : existing.unread + 1 };
      this.conversations = [updated, ...this.conversations.filter(c => c !== existing)];
    } else {
      // First message with this user: reload the list to get the contact details
      this.loadConversations(false);
    }
    // Keep the read state on the server when the conversation is open
    if (openHere && m.senderId !== this.currentUserId) this.refreshThread();
  }

  private refreshThread(): void {
    const id = this.partner?.id;
    if (!id) return;
    this.chat.messages(id).subscribe({
      next: list => {
        if (this.partner?.id !== id) return;
        const grew = list.length > this.messages.length;
        this.messages = list;
        if (grew) this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.thread?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
