import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Agent, FormOptions, LANGUAGES, ORIGIN_LABELS, TicketActivity, TicketCategory, TicketDetails, TicketMessage, TicketOrigin,
  TicketPriority, TicketStatus, UserSummary
} from '../../models/ticket.models';
import { TicketContext, TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TicketChatService } from '../../services/ticket-chat.service';
import { TicketPdfService } from '../../services/ticket-pdf.service';

interface PipelineStep { status: TicketStatus; label: string; state: 'past' | 'active' | 'future'; allowed: boolean; }
type RcaField = 'problem' | 'cause' | 'solution';

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

// Ticket record: details and customer context, problem statement, reply / internal note thread,
// H24 agent and L2 technician, history and files. New messages arrive through the /ws/tickets websocket.
@Component({
  selector: 'app-ticket-details-page',
  templateUrl: './ticket-details-page.component.html',
  styleUrls: ['./ticket-details-page.component.scss']
})
export class TicketDetailsPageComponent implements OnInit, OnDestroy {
  details?: TicketDetails;
  agents: UserSummary[] = [];
  l2Technicians: Agent[] = [];
  options: FormOptions = { customers: [], sites: [], equipment: [], projects: [] };
  readonly priorities: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly categories: TicketCategory[] = ['SOFTWARE', 'ACCESS', 'PERFORMANCE', 'BILLING', 'DATA', 'INTEGRATION', 'FEATURE_REQUEST', 'OTHER'];
  readonly origins: TicketOrigin[] = ['WEB', 'EMAIL', 'PHONE', 'INTERNAL', 'OTHER'];
  readonly originLabels = ORIGIN_LABELS;
  readonly rcaFields: { key: RcaField; label: string; placeholder: string }[] = [
    { key: 'problem', label: 'Problem', placeholder: 'Describe the observed problem…' },
    { key: 'cause', label: 'Cause', placeholder: 'Root cause analysis…' },
    { key: 'solution', label: 'Solution', placeholder: 'Solution applied or planned…' }
  ];

  error = '';
  notice = '';
  busy = false;
  saving = false;
  sending = false;
  exporting = false;
  message = '';
  internal = false;
  collapsed: Record<string, boolean> = { activities: true };
  editing: Partial<Record<RcaField, string>> = {};

  // Translation: messages from others are shown in my language; my public replies are sent in the client's language
  myLanguage = 'en';
  translateOn = false;
  translations: Record<number, string> = {};
  translating = new Set<number>();
  translateError = '';

  private id = 0;
  private subs = new Subscription();
  private liveSub?: Subscription;
  private noticeTimer?: ReturnType<typeof setTimeout>;

  private readonly currentUserId = this.auth.getCurrentUserId();

  constructor(private route: ActivatedRoute, private router: Router, public api: TicketService, public labels: TicketSettingsService,
              private live: TicketChatService, private pdf: TicketPdfService, private auth: AuthService) {}

  ngOnInit(): void {
    this.subs.add(this.labels.me().subscribe({ next: me => this.myLanguage = me.preferredLanguage || 'en' }));
    // A notification can open another ticket while this page is shown
    this.subs.add(this.route.paramMap.subscribe(p => {
      this.id = Number(p.get('id'));
      this.details = undefined;
      this.translations = {};
      this.editing = {};
      this.error = '';
      this.load();
      this.connectLive();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.liveSub?.unsubscribe();
    this.live.disconnect();
    clearTimeout(this.noticeTimer);
  }

  get closed(): boolean { return !!this.details && ['CLOSED', 'CANCELLED'].includes(this.details.ticket.status); }
  get editable(): boolean { return !!this.details?.canManage && !this.closed; }
  get publicMessages(): number { return this.details?.messages.filter(m => !m.internalNote).length ?? 0; }
  get nextStatuses(): TicketStatus[] { return this.details ? TRANSITIONS[this.details.ticket.status] : []; }
  get clientLanguage(): string { return this.details?.clientLanguage || 'en'; }
  get sameLanguage(): boolean { return this.clientLanguage === this.myLanguage; }
  get assignmentHistory(): TicketActivity[] { return (this.details?.activities ?? []).filter(a => a.field === 'assignee' || a.field === 'l2Technician' || a.activityType === 'CREATED'); }

  get pipeline(): PipelineStep[] {
    if (!this.details) return [];
    const status = this.details.ticket.status;
    // A reopened ticket is back at the start of the flow
    const current = status === 'REOPENED' ? 0 : STEPS.indexOf(status);
    return STEPS.map((step, i) => ({
      status: step,
      label: this.labels.statusLabel(step),
      state: i < current ? 'past' : i === current ? 'active' : 'future',
      allowed: !!this.details?.canManage && TRANSITIONS[status].includes(step)
    }));
  }

  load(show = true): void {
    if (show) this.busy = true;
    this.api.get(this.id).subscribe({
      next: d => {
        const customerChanged = d.ticket.customer?.id !== this.details?.ticket.customer?.id || !this.details;
        this.details = d;
        this.busy = false;
        if (d.canManage) {
          if (!this.agents.length) this.api.agents().subscribe({ next: a => this.agents = a, error: () => this.agents = [] });
          if (!this.l2Technicians.length) this.labels.agents().subscribe({ next: a => this.l2Technicians = a.filter(x => x.l2Technician), error: () => this.l2Technicians = [] });
          if (customerChanged) this.loadOptions(d.ticket.customer?.id ?? null);
        }
        if (this.translateOn) this.translateAll();
      },
      error: e => { this.error = e.error?.message || 'Ticket could not be loaded.'; this.busy = false; }
    });
  }

  // ---------- changes (each sends the version it was based on; a conflict reloads the ticket) ----------
  changeStatus(status: TicketStatus): void { this.apply(this.api.status(this.id, status, this.version), 'Status updated'); }
  setPriority(priority: TicketPriority): void { this.apply(this.api.priority(this.id, priority, this.version), 'Priority updated'); }
  setCategory(category: TicketCategory): void { this.apply(this.api.update(this.id, { category }, this.version), 'Category updated'); }
  setOrigin(origin: TicketOrigin): void { this.apply(this.api.update(this.id, { origin }, this.version), 'Origin updated'); }
  assignTo(assigneeId: number | null): void { this.apply(this.api.assign(this.id, assigneeId, this.version), assigneeId ? 'H24 agent assigned' : 'H24 agent removed'); }
  assignL2(assigneeId: number | null): void { this.apply(this.api.assignL2(this.id, assigneeId, this.version), assigneeId ? 'L2 technician assigned' : 'L2 technician removed'); }

  setCustomer(customerId: number | null): void {
    // Site, project and equipment belong to the previous customer
    this.saveContext({ customerId, site: null, projectId: null, equipmentId: null }, 'Customer updated');
  }
  setContext(change: Partial<TicketContext>): void {
    const t = this.details!.ticket;
    const next: TicketContext = { customerId: t.customer?.id ?? null, site: t.site ?? null, projectId: t.project?.id ?? null, equipmentId: this.details!.equipment?.id ?? null, ...change };
    // Picking equipment fills the site it is installed at
    if (change.equipmentId) {
      const item = this.options.equipment.find(e => e.id === change.equipmentId);
      if (item?.siteName) next.site = item.siteName;
    }
    this.saveContext(next, 'Ticket updated');
  }

  // ---------- problem statement ----------
  edit(field: RcaField): void { this.editing[field] = this.details?.[field] ?? ''; }
  cancelEdit(field: RcaField): void { delete this.editing[field]; }
  saveRca(field: RcaField): void {
    if (!this.details) return;
    const value = { problem: this.details.problem ?? '', cause: this.details.cause ?? '', solution: this.details.solution ?? '', [field]: this.editing[field] ?? '' };
    this.saving = true;
    this.api.problemStatement(this.id, value, this.version).subscribe({
      next: d => { this.details = d; delete this.editing[field]; this.saving = false; this.flash('Problem statement saved'); },
      error: e => { this.saving = false; this.fail(e, 'Problem statement could not be saved.'); }
    });
  }

  // ---------- thread ----------
  send(): void {
    const text = this.message.trim();
    if (!text || this.sending || this.closed) return;
    const internal = this.internal && !!this.details?.canManage;
    this.sending = true;
    this.error = '';
    if (this.translateOn && !internal && !this.sameLanguage) {
      this.api.translate(text, this.clientLanguage).subscribe({
        next: translated => this.post(translated, false),
        error: e => { this.sending = false; this.error = (e.error?.message || 'Translation is unavailable') + '. Turn translation off to send the original text.'; }
      });
    } else {
      this.post(text, internal);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.send(); }
  }

  toggleTranslation(on: boolean): void {
    this.translateOn = on;
    this.translateError = '';
    if (on) this.translateAll();
  }

  isMine(m: TicketMessage): boolean { return m.sender?.id === this.currentUserId; }

  file(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { this.error = 'Files are limited to 10 MB.'; input.value = ''; return; }
    this.api.upload(this.id, f).subscribe({
      next: a => { this.details?.attachments.push(a); input.value = ''; this.flash('File attached'); },
      error: e => { this.error = e.error?.message || 'Attachment could not be uploaded.'; input.value = ''; }
    });
  }

  async exportPdf(): Promise<void> {
    if (!this.details || this.exporting) return;
    this.exporting = true;
    try { await this.pdf.download(this.details); }
    catch { this.error = 'The PDF could not be generated.'; }
    finally { this.exporting = false; }
  }

  back(): void { void this.router.navigate(['/tickets']); }
  toggle(section: string): void { this.collapsed[section] = !this.collapsed[section]; }
  isClientMessage(m: TicketMessage): boolean { return m.sender?.id === this.details?.ticket.client?.id; }
  initials(name?: string): string { return (name || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  label(v: string): string { return (v || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
  languageName(code: string): string { return LANGUAGES.find(l => l.code === code)?.label ?? code; }
  agentOptionMissing(id?: number): boolean { return !!id && !this.agents.some(a => a.id === id); }
  l2OptionMissing(id?: number): boolean { return !!id && !this.l2Technicians.some(a => a.id === id); }

  private get version(): number { return this.details!.version; }

  private apply(request: ReturnType<TicketService['status']>, done: string): void {
    if (!this.details?.canManage) return;
    this.error = '';
    this.saving = true;
    request.subscribe({
      next: d => { this.details = d; this.saving = false; this.flash(done); },
      error: e => { this.saving = false; this.fail(e, 'The change was rejected.'); }
    });
  }

  private saveContext(context: TicketContext, done: string): void {
    if (!this.details?.canManage) return;
    this.saving = true;
    this.api.context(this.id, context, this.version).subscribe({
      next: d => {
        const customerChanged = d.ticket.customer?.id !== this.details?.ticket.customer?.id;
        this.details = d;
        this.saving = false;
        if (customerChanged) this.loadOptions(d.ticket.customer?.id ?? null);
        this.flash(done);
      },
      error: e => { this.saving = false; this.fail(e, 'The change was rejected.'); }
    });
  }

  private loadOptions(customerId: number | null): void {
    this.api.formOptions(customerId).subscribe({ next: o => this.options = o, error: () => this.options = { customers: [], sites: [], equipment: [], projects: [] } });
  }

  private post(text: string, internal: boolean): void {
    this.api.message(this.id, text, internal).subscribe({
      next: () => { this.message = ''; this.sending = false; this.load(false); },
      error: e => { this.error = e.error?.message || 'Message could not be sent.'; this.sending = false; }
    });
  }

  private translateAll(): void {
    if (!this.details) return;
    for (const m of this.details.messages.filter(x => !this.isMine(x))) {
      if (this.translations[m.id] || this.translating.has(m.id)) continue;
      this.translating.add(m.id);
      this.api.translate(m.message, this.myLanguage).subscribe({
        next: t => { this.translations[m.id] = t; this.translating.delete(m.id); },
        error: e => { this.translating.delete(m.id); this.translateError = e.error?.message || 'Translation is unavailable right now.'; }
      });
    }
  }

  private connectLive(): void {
    this.liveSub?.unsubscribe();
    this.live.connect(this.id);
    this.liveSub = this.live.updates.subscribe(event => {
      if (event?.type === 'message' && Number(event.ticketId) === this.id) this.load(false);
    });
  }

  private fail(e: any, fallback: string): void {
    this.error = e.status === 409 ? 'Someone else changed this ticket; it has been reloaded. Please try again.' : (e.error?.message || fallback);
    this.load(false);
  }

  private flash(text: string): void {
    this.notice = text;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice = '', 2500);
  }
}
