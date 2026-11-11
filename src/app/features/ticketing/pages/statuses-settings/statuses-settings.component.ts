import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CustomStatus, StatusColor, StatusSetting, TicketStatus } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';
import { I18nService } from 'src/app/core/i18n/i18n.service';

// Wording and colour of each system ticket status. The lifecycle itself (system statuses and the allowed
// transitions) is fixed by the backend, so system statuses cannot be added, renamed in code or removed.
// Custom statuses (below) are created, edited and deleted by leads; each maps onto a lifecycle status.
@Component({
  selector: 'app-statuses-settings',
  templateUrl: './statuses-settings.component.html',
  styleUrls: ['./statuses-settings.component.scss']
})
export class StatusesSettingsComponent implements OnInit, OnDestroy {
  rows: StatusSetting[] = [];
  loading = true;
  saving = false;
  submitted = false;
  error = '';
  notice = '';
  readonly colors: StatusColor[] = ['blue', 'amber', 'red', 'green', 'gray', 'purple', 'coral'];
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  custom: CustomStatus[] = [];
  draft: Partial<CustomStatus> | null = null;
  draftError = '';
  readonly baseStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
  private saved = '';
  private sub?: Subscription;

  constructor(private i18n: I18nService,
    private settings: TicketSettingsService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.sub?.unsubscribe();
    this.sub = this.settings.refresh().subscribe({
      next: s => {
        this.rows = s.statuses.map(x => ({ ...x }));
        this.custom = s.customStatuses ?? [];
        this.saved = JSON.stringify(this.rows);
        this.loading = false;
      },
      error: e => { this.loading = false; this.error = this.i18n.error(e, 'ticketing.statuses.statusesCouldNotLoaded'); }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get dirty(): boolean { return JSON.stringify(this.rows) !== this.saved; }
  get invalid(): boolean { return this.rows.some(r => !r.label.trim()); }

  reset(): void { this.rows = JSON.parse(this.saved); this.submitted = false; }

  save(): void {
    this.submitted = true;
    if (this.invalid) return;
    this.saving = true;
    this.error = '';
    this.settings.saveStatuses(this.rows.map(r => ({ ...r, label: r.label.trim(), description: r.description?.trim() || undefined }))).subscribe({
      next: s => {
        this.rows = s.statuses.map(x => ({ ...x }));
        this.saved = JSON.stringify(this.rows);
        this.saving = false;
        this.submitted = false;
        this.flash(this.i18n.t('ticketing.statuses.statusesSaved'));
      },
      error: e => { this.saving = false; this.error = this.i18n.error(e, 'ticketing.statuses.statusesCouldNotSaved'); }
    });
  }

  // ---------- custom statuses ----------
  newCustom(): void { this.draft = { label: '', description: '', color: 'blue', baseStatus: 'IN_PROGRESS' }; this.draftError = ''; }
  editCustom(c: CustomStatus): void { this.draft = { ...c }; this.draftError = ''; }
  saveCustom(): void {
    if (!this.draft || this.saving) return;
    if (!this.draft.label?.trim()) { this.draftError = this.i18n.t('ticketing.statuses.everyStatusNeedsLabel'); return; }
    this.saving = true;
    this.settings.saveCustomStatus({ ...this.draft, label: this.draft.label.trim(), description: this.draft.description?.trim() || undefined }).subscribe({
      next: () => { this.saving = false; this.draft = null; this.flash(this.i18n.t('ticketing.statuses.statusesSaved')); this.load(); },
      error: e => { this.saving = false; this.draftError = this.i18n.error(e, 'ticketing.statuses.statusesCouldNotSaved'); }
    });
  }
  deleteCustom(c: CustomStatus): void {
    const key = c.ticketCount ? 'ticketing.statuses.confirmDeleteInUse' : 'ticketing.statuses.confirmDelete';
    if (!confirm(this.i18n.t(key, { label: c.label, count: c.ticketCount, base: this.settings.statusLabel(c.baseStatus) }))) return;
    this.saving = true;
    this.settings.deleteCustomStatus(c.id).subscribe({
      next: () => { this.saving = false; this.flash(this.i18n.t('ticketing.statuses.statusDeleted')); this.load(); },
      error: e => { this.saving = false; this.error = this.i18n.error(e, 'ticketing.statuses.statusesCouldNotSaved'); }
    });
  }
  baseLabel(s: TicketStatus): string { return this.settings.statusLabel(s); }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
