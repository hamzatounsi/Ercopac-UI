import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatContact, TicketCategory, TicketPriority } from '../../models/ticket.models';
import { DirectChatService } from '../../services/direct-chat.service';
import { TicketService } from '../../services/ticket.service';
import { TICKETING_STAFF_ROLES } from '../../ticketing-roles';

type TicketOrigin = 'WEB' | 'EMAIL' | 'PHONE' | 'INTERNAL' | 'OTHER';

// New ticket. A client's ticket is linked to the client by the backend;
// support staff choose the client (CLIENT users of the organisation) and the origin.
@Component({
  selector: 'app-ticket-create-page',
  templateUrl: './ticket-create-page.component.html',
  styleUrls: ['./ticket-create-page.component.scss']
})
export class TicketCreatePageComponent implements OnInit {
  readonly categories: TicketCategory[] = ['SOFTWARE', 'ACCESS', 'PERFORMANCE', 'BILLING', 'DATA', 'INTEGRATION', 'FEATURE_REQUEST', 'OTHER'];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly origins: TicketOrigin[] = ['PHONE', 'EMAIL', 'WEB', 'INTERNAL', 'OTHER'];
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);

  clients: ChatContact[] = [];
  form = {
    subject: '',
    description: '',
    category: 'SOFTWARE' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
    origin: (this.isStaff ? 'PHONE' : 'WEB') as TicketOrigin,
    site: '',
    clientUserId: null as number | null
  };
  saving = false;
  error = '';

  constructor(private api: TicketService, private chat: DirectChatService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.isStaff) {
      this.chat.contacts().subscribe({ next: c => this.clients = c.filter(x => !x.staff), error: () => this.clients = [] });
    }
  }

  get valid(): boolean { return !!this.form.subject.trim() && !!this.form.description.trim(); }

  submit(): void {
    if (!this.valid || this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.create({
      subject: this.form.subject.trim(),
      description: this.form.description.trim(),
      category: this.form.category,
      priority: this.form.priority,
      origin: this.isStaff ? this.form.origin : 'WEB',
      site: this.form.site.trim() || null,
      clientUserId: this.isStaff ? this.form.clientUserId : null
    }).subscribe({
      next: created => void this.router.navigate(['/tickets', created.ticket.id]),
      error: e => { this.error = e.error?.message || 'Ticket could not be created.'; this.saving = false; }
    });
  }

  cancel(): void { void this.router.navigate(['/tickets']); }
  label(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
}
