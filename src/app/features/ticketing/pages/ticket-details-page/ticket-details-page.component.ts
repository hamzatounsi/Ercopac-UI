import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  Agent, FormOptions, LANGUAGES, ORIGIN_LABELS, TicketActivity, TicketCategory, TicketDetails, TicketMessage, TicketOrigin,
  TicketPriority, TicketStatus, UserSummary
} from '../../models/ticket.models';
import { TicketContext, TicketService } from '../../services/ticket.service';
import { PickOption } from '../../components/select-or-manual/select-or-manual.component';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TicketChatService } from '../../services/ticket-chat.service';
import { TicketPdfService } from '../../services/ticket-pdf.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

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
    { key: 'problem', label: 'ticketing.details.problem', placeholder: 'ticketing.details.problemPlaceholder' },
    { key: 'cause', label: 'ticketing.details.cause', placeholder: 'ticketing.details.causePlaceholder' },
    { key: 'solution', label: 'ticketing.details.solution', placeholder: 'ticketing.details.solutionPlaceholder' }
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

  // Customer / project: linked to Projectum or entered by hand (drafts are saved with the Save button)
  customerManual = false;
  projectManual = false;
  customerDraft = '';
  projectDraft = { name: '', number: '', year: null as number | null };

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

  constructor(private i18n: I18nService,
    private route: ActivatedRoute, private router: Router, public api: TicketService, public labels: TicketSettingsService,
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
        this.syncContextDrafts();
        this.busy = false;
        if (d.canManage) {
          if (!this.agents.length) this.api.agents().subscribe({ next: a => this.agents = a, error: () => this.agents = [] });
          if (!this.l2Technicians.length) this.labels.agents().subscribe({ next: a => this.l2Technicians = a.filter(x => x.l2Technician), error: () => this.l2Technicians = [] });
          if (customerChanged) this.loadOptions(d.ticket.customer?.id ?? null);
        }
        if (this.translateOn) this.translateAll();
      },
      error: e => { this.error = this.i18n.error(e, 'ticketing.details.ticketCouldNotLoaded'); this.busy = false; }
    });
  }

  // ---------- changes (each sends the version it was based on; a conflict reloads the ticket) ----------
  changeStatus(status: TicketStatus): void { this.apply(this.api.status(this.id, status, this.version), this.i18n.t('ticketing.details.statusUpdated')); }
  setPriority(priority: TicketPriority): void { this.apply(this.api.priority(this.id, priority, this.version), this.i18n.t('ticketing.details.priorityUpdated')); }
  setCategory(category: TicketCategory): void { this.apply(this.api.update(this.id, { category }, this.version), this.i18n.t('ticketing.details.categoryUpdated')); }
  setOrigin(origin: TicketOrigin): void { this.apply(this.api.update(this.id, { origin }, this.version), this.i18n.t('ticketing.details.originUpdated')); }
  assignTo(assigneeId: number | null): void { this.apply(this.api.assign(this.id, assigneeId, this.version), assigneeId ? this.i18n.t('ticketing.details.h24AgentAssigned') : this.i18n.t('ticketing.details.h24AgentRemoved')); }
  assignL2(assigneeId: number | null): void { this.apply(this.api.assignL2(this.id, assigneeId, this.version), assigneeId ? this.i18n.t('ticketing.details.l2TechnicianAssigned') : this.i18n.t('ticketing.details.l2TechnicianRemoved')); }

  get customerOptions(): PickOption[] { return this.options.customers.map(c => ({ id: c.id, label: c.name })); }
  get projectOptions(): PickOption[] {
    return this.options.projects.map(p => ({ id: p.id, label: p.name, hint: [p.code, p.year].filter(v => v != null && v !== '').join(' · ') || undefined }));
  }
  /** Resource type of the current L2 technician, so the cascading choice opens on it. */
  get l2ResourceTypeId(): number | null {
    const id = this.details?.ticket.l2Technician?.id;
    return this.l2Technicians.find(a => a.id === id)?.resourceTypeId ?? null;
  }

  setCustomer(customerId: number | null): void {
    // Site, project and equipment belong to the previous customer; a manual project is kept
    const t = this.details!.ticket;
    const keep = t.project && t.project.id == null ? this.currentContext() : null;
    this.saveContext({ customerId, site: null, projectId: null, equipmentId: null,
      projectName: keep?.projectName ?? null, projectNumber: keep?.projectNumber ?? null, projectYear: keep?.projectYear ?? null }, this.i18n.t('ticketing.details.customerUpdated'));
  }
  setCustomerManual(on: boolean): void {
    this.customerManual = on;
    this.customerDraft = on && this.details?.ticket.customer?.id == null ? this.details?.ticket.customer?.name ?? '' : '';
  }
  saveManualCustomer(): void {
    const name = this.customerDraft.trim();
    if (!name) { this.flash(this.i18n.t('ticketing.details.enterCustomerName')); return; }
    this.saveContext({ ...this.currentContext(), customerId: null, customerName: name, site: null, equipmentId: null }, this.i18n.t('ticketing.details.customerUpdated'));
  }

  setProject(projectId: number | null): void { this.setContext({ projectId, projectName: null, projectNumber: null, projectYear: null }); }
  setProjectManual(on: boolean): void {
    this.projectManual = on;
    const p = this.details?.ticket;
    this.projectDraft = on && p?.project && p.project.id == null ? { name: p.project.name, number: p.projectNumber ?? '', year: p.projectYear ?? null } : { name: '', number: '', year: null };
  }
  saveManualProject(): void {
    const name = this.projectDraft.name.trim();
    const year = this.projectDraft.year;
    if (!name) { this.flash(this.i18n.t('ticketing.details.enterProjectName')); return; }
    if (year != null && (!Number.isInteger(+year) || +year < 1900 || +year > 2100)) { this.flash(this.i18n.t('ticketing.details.yearMustBetween1900')); return; }
    this.setContext({ projectId: null, projectName: name, projectNumber: this.projectDraft.number.trim() || null, projectYear: year == null ? null : +year });
  }

  setContext(change: Partial<TicketContext>): void {
    const next: TicketContext = { ...this.currentContext(), ...change };
    // Picking equipment fills the site it is installed at
    if (change.equipmentId) {
      const item = this.options.equipment.find(e => e.id === change.equipmentId);
      if (item?.siteName) next.site = item.siteName;
    }
    this.saveContext(next, this.i18n.t('ticketing.details.ticketUpdated'));
  }

  // ---------- problem statement ----------
  edit(field: RcaField): void { this.editing[field] = this.details?.[field] ?? ''; }
  cancelEdit(field: RcaField): void { delete this.editing[field]; }
  saveRca(field: RcaField): void {
    if (!this.details) return;
    const value = { problem: this.details.problem ?? '', cause: this.details.cause ?? '', solution: this.details.solution ?? '', [field]: this.editing[field] ?? '' };
    this.saving = true;
    this.api.problemStatement(this.id, value, this.version).subscribe({
      next: d => { this.details = d; delete this.editing[field]; this.saving = false; this.flash(this.i18n.t('ticketing.details.problemStatementSaved')); },
      error: e => { this.saving = false; this.fail(e, 'ticketing.details.problemStatementCouldNot'); }
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
        error: e => { this.sending = false; this.error = this.i18n.error(e, 'ticketing.details.translationUnavailableSendOriginal'); }
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
    if (f.size > 10 * 1024 * 1024) { this.error = this.i18n.t('ticketing.details.filesLimited10Mb'); input.value = ''; return; }
    this.api.upload(this.id, f).subscribe({
      next: a => { this.details?.attachments.push(a); input.value = ''; this.flash(this.i18n.t('ticketing.details.fileAttached')); },
      error: e => { this.error = this.i18n.error(e, 'ticketing.details.attachmentCouldNotUploaded'); input.value = ''; }
    });
  }

  async exportPdf(): Promise<void> {
    if (!this.details || this.exporting) return;
    this.exporting = true;
    try { await this.pdf.download(this.details); }
    catch { this.error = this.i18n.t('ticketing.details.pdfCouldNotGenerated'); }
    finally { this.exporting = false; }
  }

  back(): void { void this.router.navigate(['/tickets']); }
  toggle(section: string): void { this.collapsed[section] = !this.collapsed[section]; }
  isClientMessage(m: TicketMessage): boolean { return m.sender?.id === this.details?.ticket.client?.id; }
  initials(name?: string): string { return (name || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  label(category: string): string { return category ? this.i18n.t('ticketing.categories.' + category) : ''; }
  languageName(code: string): string { const label = LANGUAGES.find(l => l.code === code)?.label; return label ? this.i18n.t(label) : code; }
  agentOptionMissing(id?: number): boolean { return !!id && !this.agents.some(a => a.id === id); }

  private get version(): number { return this.details!.version; }

  /** Context as saved on the ticket; manual customers / projects are sent back by name so they are kept. */
  private currentContext(): TicketContext {
    const t = this.details!.ticket;
    const manualCustomer = !!t.customer && t.customer.id == null;
    const manualProject = !!t.project && t.project.id == null;
    return {
      customerId: t.customer?.id ?? null, customerName: manualCustomer ? t.customer!.name : null,
      site: t.site ?? null, equipmentId: this.details!.equipment?.id ?? null,
      projectId: t.project?.id ?? null, projectName: manualProject ? t.project!.name : null,
      projectNumber: manualProject ? t.projectNumber ?? null : null, projectYear: manualProject ? t.projectYear ?? null : null
    };
  }

  private syncContextDrafts(): void {
    const t = this.details?.ticket;
    this.customerManual = !!t?.customer && t.customer.id == null;
    this.projectManual = !!t?.project && t.project.id == null;
    this.setCustomerManual(this.customerManual);
    this.setProjectManual(this.projectManual);
  }

  private apply(request: ReturnType<TicketService['status']>, done: string): void {
    if (!this.details?.canManage) return;
    this.error = '';
    this.saving = true;
    request.subscribe({
      next: d => { this.details = d; this.saving = false; this.flash(done); },
      error: e => { this.saving = false; this.fail(e, 'ticketing.details.changeWasRejected'); }
    });
  }

  private saveContext(context: TicketContext, done: string): void {
    if (!this.details?.canManage) return;
    this.saving = true;
    this.api.context(this.id, context, this.version).subscribe({
      next: d => {
        const customerChanged = d.ticket.customer?.id !== this.details?.ticket.customer?.id;
        this.details = d;
        this.syncContextDrafts();
        this.saving = false;
        if (customerChanged) this.loadOptions(d.ticket.customer?.id ?? null);
        this.flash(done);
      },
      error: e => { this.saving = false; this.fail(e, 'ticketing.details.changeWasRejected'); }
    });
  }

  private loadOptions(customerId: number | null): void {
    this.api.formOptions(customerId).subscribe({ next: o => this.options = o, error: () => this.options = { customers: [], sites: [], equipment: [], projects: [] } });
  }

  private post(text: string, internal: boolean): void {
    this.api.message(this.id, text, internal).subscribe({
      next: () => { this.message = ''; this.sending = false; this.load(false); },
      error: e => { this.error = this.i18n.error(e, 'ticketing.details.messageCouldNotSent'); this.sending = false; }
    });
  }

  private translateAll(): void {
    if (!this.details) return;
    for (const m of this.details.messages.filter(x => !this.isMine(x))) {
      if (this.translations[m.id] || this.translating.has(m.id)) continue;
      this.translating.add(m.id);
      this.api.translate(m.message, this.myLanguage).subscribe({
        next: t => { this.translations[m.id] = t; this.translating.delete(m.id); },
        error: e => { this.translating.delete(m.id); this.translateError = this.i18n.error(e, 'ticketing.details.translationUnavailableRightNow'); }
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

  private fail(e: any, fallbackKey: string): void {
    this.error = e.status === 409 ? this.i18n.t('ticketing.details.someoneElseChangedTicket') : this.i18n.error(e, fallbackKey);
    this.load(false);
  }

  private flash(text: string): void {
    this.notice = text;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice = '', 2500);
  }
}
