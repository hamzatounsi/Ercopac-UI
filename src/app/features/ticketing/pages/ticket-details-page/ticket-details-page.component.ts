import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TicketDetails, TicketMessage, TicketPriority, TicketStatus, UserSummary } from '../../models/ticket.models';
import { TicketService } from '../../services/ticket.service';

interface PipelineStep { status: TicketStatus; label: string; state: 'past' | 'active' | 'future'; allowed: boolean; }

// Same transitions as TicketStatusTransitionValidator in the backend
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CANCELLED'],
  IN_PROGRESS: ['ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  REOPENED: ['IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: []
};
const STEPS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

// Ticket record: details, problem statement, reply / internal note thread, assignment, history and files.
// The thread is the ticket's record and is not live; one-to-one chat lives on the Live chat page.
@Component({
  selector: 'app-ticket-details-page',
  templateUrl: './ticket-details-page.component.html',
  styleUrls: ['./ticket-details-page.component.scss']
})
export class TicketDetailsPageComponent implements OnInit {
  details?: TicketDetails;
  agents: UserSummary[] = [];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  error = '';
  busy = false;
  sending = false;
  message = '';
  internal = false;
  collapsed: Record<string, boolean> = {};
  private id = 0;

  constructor(private route: ActivatedRoute, public api: TicketService) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  get closed(): boolean { return !!this.details && ['CLOSED', 'CANCELLED'].includes(this.details.ticket.status); }
  get editable(): boolean { return !!this.details?.canManage && !this.closed; }
  get publicMessages(): number { return this.details?.messages.filter(m => !m.internalNote).length ?? 0; }

  get pipeline(): PipelineStep[] {
    if (!this.details) return [];
    const status = this.details.ticket.status;
    // A reopened ticket is back at the start of the flow
    const current = status === 'REOPENED' ? 0 : STEPS.indexOf(status);
    return STEPS.map((step, i) => ({
      status: step,
      label: this.label(step),
      state: i < current ? 'past' : i === current ? 'active' : 'future',
      allowed: !!this.details?.canManage && TRANSITIONS[status].includes(step)
    }));
  }

  get nextStatuses(): TicketStatus[] { return this.details ? TRANSITIONS[this.details.ticket.status] : []; }

  load(show = true): void {
    if (show) this.busy = true;
    this.api.get(this.id).subscribe({
      next: d => {
        this.details = d;
        this.busy = false;
        // Only support staff can assign, so only they need the agent list
        if (d.canManage && !this.agents.length) this.api.agents().subscribe({ next: a => this.agents = a, error: () => this.agents = [] });
      },
      error: e => { this.error = e.error?.message || 'Ticket could not be loaded.'; this.busy = false; }
    });
  }

  changeStatus(status: TicketStatus): void {
    if (!this.details || !this.details.canManage) return;
    this.error = '';
    this.api.status(this.id, status, this.details.version).subscribe({
      next: d => this.details = d,
      error: e => { this.error = e.error?.message || 'Status change was rejected.'; this.load(false); }
    });
  }

  assignTo(assigneeId: number | null): void {
    if (!this.details) return;
    this.error = '';
    this.api.assign(this.id, assigneeId, this.details.version).subscribe({
      next: d => this.details = d,
      error: e => { this.error = e.error?.message || 'Assignment was rejected.'; this.load(false); }
    });
  }

  setPriority(priority: TicketPriority): void {
    if (!this.details) return;
    this.error = '';
    this.api.priority(this.id, priority, this.details.version).subscribe({
      next: d => this.details = d,
      error: e => { this.error = e.error?.message || 'Priority change was rejected.'; this.load(false); }
    });
  }

  send(): void {
    const text = this.message.trim();
    if (!text || this.sending || this.closed) return;
    this.sending = true;
    this.api.message(this.id, text, this.internal && !!this.details?.canManage).subscribe({
      next: () => { this.message = ''; this.sending = false; this.load(false); },
      error: e => { this.error = e.error?.message || 'Message could not be sent.'; this.sending = false; }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  file(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.api.upload(this.id, f).subscribe({
      next: a => { this.details?.attachments.push(a); input.value = ''; },
      error: e => this.error = e.error?.message || 'Attachment could not be uploaded.'
    });
  }

  toggle(section: string): void { this.collapsed[section] = !this.collapsed[section]; }
  isClientMessage(m: TicketMessage): boolean { return m.sender?.id === this.details?.ticket.client?.id; }
  initials(name?: string): string { return (name || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  label(v: string): string { return (v || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
}
