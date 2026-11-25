import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { STATUS_PALETTE, StatusColor, TicketStatusDef } from '../../models/ticket.models';
import { TicketStatusService, isPaletteColor } from '../../services/ticket-status.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

interface Draft { id?: number; name: string; description: string; color: string; isDefault: boolean; isClosed: boolean; active: boolean; }
interface DeleteState { status: TicketStatusDef; ticketCount: number; reassignTo: number | null; }

// Settings > Statuses: the organisation's ticket statuses. Nothing is built in: leads add, edit, order,
// (de)activate and delete statuses. A status used by tickets is not hard deleted: its tickets are moved to
// another status first, or it is deactivated. The default status (new tickets) cannot be deleted or closed.
@Component({
  selector: 'app-statuses-settings',
  templateUrl: './statuses-settings.component.html',
  styleUrls: ['./statuses-settings.component.scss']
})
export class StatusesSettingsComponent implements OnInit, OnDestroy {
  rows: TicketStatusDef[] = [];
  loading = true;
  saving = false;
  error = '';
  notice = '';
  noticeError = false;
  readonly palette: StatusColor[] = STATUS_PALETTE;
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  draft: Draft | null = null;
  draftError = '';
  submitted = false;
  removing: DeleteState | null = null;
  private sub?: Subscription;
  private noticeTimer?: ReturnType<typeof setTimeout>;

  constructor(private i18n: I18nService, private statuses: TicketStatusService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.sub?.unsubscribe(); clearTimeout(this.noticeTimer); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.sub?.unsubscribe();
    this.sub = this.statuses.refresh().subscribe({
      next: list => { this.rows = [...list].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id); this.loading = false; },
      error: e => { this.loading = false; this.error = this.i18n.error(e, 'ticketing.statusesAdmin.couldNotLoad'); }
    });
  }

  // ---------- add / edit dialog ----------
  add(): void {
    this.draft = { name: '', description: '', color: 'blue', isDefault: !this.rows.some(r => r.isDefault), isClosed: false, active: true };
    this.draftError = ''; this.submitted = false;
  }
  edit(s: TicketStatusDef): void {
    this.draft = { id: s.id, name: s.name, description: s.description ?? '', color: s.color, isDefault: s.isDefault, isClosed: s.isClosed, active: s.active };
    this.draftError = ''; this.submitted = false;
  }
  closeDraft(): void { if (!this.saving) this.draft = null; }

  get editingDefault(): boolean { return !!this.draft?.id && !!this.rows.find(r => r.id === this.draft?.id)?.isDefault; }
  get nameError(): string {
    const name = this.draft?.name.trim() ?? '';
    if (!name) return 'ticketing.statusesAdmin.nameRequired';
    if (this.rows.some(r => r.id !== this.draft?.id && r.name.trim().toLowerCase() === name.toLowerCase())) return 'ticketing.statusesAdmin.nameTaken';
    return '';
  }
  get customColor(): string { return this.draft && !isPaletteColor(this.draft.color) ? this.draft.color : '#3b82f6'; }
  isPalette(c: string): boolean { return isPaletteColor(c); }
  /** Preview of the dialog as a status, for the badge. */
  get preview(): { name: string; color: string } { return { name: this.draft?.name.trim() || this.i18n.t('ticketing.statusesAdmin.preview'), color: this.draft?.color ?? 'gray' }; }

  save(): void {
    if (!this.draft || this.saving) return;
    this.submitted = true;
    if (this.nameError) return;
    const d = this.draft;
    if (d.isDefault && d.isClosed) { this.draftError = this.i18n.t('ticketing.statusesAdmin.defaultCannotBeClosed'); return; }
    if (d.isDefault && !d.active) { this.draftError = this.i18n.t('ticketing.statusesAdmin.defaultMustBeActive'); return; }
    this.saving = true;
    this.draftError = '';
    const body = { name: d.name.trim(), description: d.description.trim() || null, color: d.color, isDefault: d.isDefault, isClosed: d.isClosed, active: d.active };
    (d.id ? this.statuses.update(d.id, body) : this.statuses.create(body)).subscribe({
      next: () => { this.saving = false; this.draft = null; this.flash(this.i18n.t(d.id ? 'ticketing.statusesAdmin.updated' : 'ticketing.statusesAdmin.created', { name: body.name })); this.load(); },
      error: e => { this.saving = false; this.draftError = this.i18n.error(e, 'ticketing.statusesAdmin.couldNotSave'); }
    });
  }

  // ---------- quick changes ----------
  toggleActive(s: TicketStatusDef): void {
    if (s.isDefault && s.active) { this.flash(this.i18n.t('ticketing.statusesAdmin.defaultMustBeActive'), true); return; }
    this.quickUpdate(s, { active: !s.active }, s.active ? 'ticketing.statusesAdmin.deactivated' : 'ticketing.statusesAdmin.activated');
  }
  makeDefault(s: TicketStatusDef): void {
    if (s.isClosed || !s.active || s.isDefault) return;
    this.quickUpdate(s, { isDefault: true }, 'ticketing.statusesAdmin.defaultSet');
  }
  private quickUpdate(s: TicketStatusDef, change: { active?: boolean; isDefault?: boolean }, okKey: string): void {
    this.saving = true;
    this.statuses.update(s.id, { name: s.name, description: s.description ?? null, color: s.color, isClosed: s.isClosed, ...change }).subscribe({
      next: () => { this.saving = false; this.flash(this.i18n.t(okKey, { name: s.name })); this.load(); },
      error: e => { this.saving = false; this.flash(this.i18n.error(e, 'ticketing.statusesAdmin.couldNotSave'), true); }
    });
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.rows.length || this.saving) return;
    const rows = [...this.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    this.rows = rows;
    this.saving = true;
    this.statuses.reorder(rows.map(r => r.id)).subscribe({
      next: list => { this.saving = false; this.rows = list; this.flash(this.i18n.t('ticketing.statusesAdmin.orderSaved')); },
      error: e => { this.saving = false; this.flash(this.i18n.error(e, 'ticketing.statusesAdmin.couldNotSave'), true); this.load(); }
    });
  }

  // ---------- delete ----------
  remove(s: TicketStatusDef): void {
    if (s.isDefault) { this.flash(this.i18n.t('ticketing.statusesAdmin.defaultCannotBeDeleted'), true); return; }
    if (s.ticketCount > 0) { this.openReassign(s, s.ticketCount); return; }
    if (!confirm(this.i18n.t('ticketing.statusesAdmin.confirmDelete', { name: s.name }))) return;
    this.doDelete(s, null);
  }
  /** Statuses the tickets of the removed status can move to. */
  get reassignTargets(): TicketStatusDef[] { return this.rows.filter(r => r.active && r.id !== this.removing?.status.id); }

  confirmReassign(): void {
    if (!this.removing?.reassignTo) return;
    this.doDelete(this.removing.status, this.removing.reassignTo);
  }
  deactivateInstead(): void {
    if (!this.removing) return;
    const s = this.removing.status;
    this.removing = null;
    if (s.active) this.quickUpdate(s, { active: false }, 'ticketing.statusesAdmin.deactivated');
  }

  private openReassign(s: TicketStatusDef, ticketCount: number): void {
    const fallback = this.rows.find(r => r.isDefault && r.id !== s.id) ?? this.rows.find(r => r.active && r.id !== s.id);
    this.removing = { status: s, ticketCount, reassignTo: fallback?.id ?? null };
  }

  private doDelete(s: TicketStatusDef, reassignTo: number | null): void {
    this.saving = true;
    this.statuses.delete(s.id, reassignTo).subscribe({
      next: () => {
        this.saving = false; this.removing = null;
        this.flash(this.i18n.t(reassignTo ? 'ticketing.statusesAdmin.deletedMoved' : 'ticketing.statusesAdmin.deleted', { name: s.name }));
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.saving = false;
        // Used by tickets meanwhile: offer the reassign / deactivate choice with the count from the server
        if (e.status === 409 && e.error?.code === 'STATUS_IN_USE') { this.openReassign(s, Number(e.error.ticketCount) || 0); return; }
        this.removing = null;
        this.flash(this.i18n.error(e, 'ticketing.statusesAdmin.couldNotDelete'), true);
      }
    });
  }

  private flash(text: string, isError = false): void {
    this.notice = text; this.noticeError = isError;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice = '', isError ? 5000 : 2500);
  }
}
