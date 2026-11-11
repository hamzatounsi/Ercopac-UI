import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { CategorySetting } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

// Ticket categories: system categories (renamable, never deleted) and custom ones (create / rename / deactivate / delete).
// A category used by tickets can only be deleted after choosing the category its tickets move to.
@Component({
  selector: 'app-categories-settings',
  templateUrl: './categories-settings.component.html',
  styleUrls: ['./categories-settings.component.scss']
})
export class CategoriesSettingsComponent implements OnInit {
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  rows: CategorySetting[] = [];
  loading = true;
  saving = false;
  error = '';
  notice = '';
  newLabel = '';
  editing: Record<number, string> = {};
  deleting: CategorySetting | null = null;
  reassignTo = '';

  constructor(private settings: TicketSettingsService, private auth: AuthService, private i18n: I18nService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.refresh().subscribe({
      next: s => { this.rows = s.categories ?? []; this.loading = false; },
      error: e => { this.loading = false; this.error = this.i18n.error(e, 'ticketing.categoriesSettings.couldNotLoad'); }
    });
  }

  add(): void {
    const label = this.newLabel.trim();
    if (!label || this.saving) return;
    this.run(this.settings.createCategory({ label }), () => { this.newLabel = ''; this.flash('ticketing.categoriesSettings.saved'); });
  }

  startEdit(c: CategorySetting): void { this.editing[c.id] = c.label; }
  cancelEdit(c: CategorySetting): void { delete this.editing[c.id]; }
  saveLabel(c: CategorySetting): void {
    const label = (this.editing[c.id] ?? '').trim();
    if (!label) return;
    this.run(this.settings.updateCategory(c.id, { label, active: c.active }), () => { delete this.editing[c.id]; this.flash('ticketing.categoriesSettings.saved'); });
  }
  toggleActive(c: CategorySetting): void {
    this.run(this.settings.updateCategory(c.id, { label: c.label, active: !c.active }), () => this.flash('ticketing.categoriesSettings.saved'));
  }

  askDelete(c: CategorySetting): void {
    if (c.system) return;
    if (!c.ticketCount) {
      if (!confirm(this.i18n.t('ticketing.categoriesSettings.confirmDelete', { label: c.label }))) return;
      this.run(this.settings.deleteCategory(c.id), () => this.flash('ticketing.categoriesSettings.deleted'));
      return;
    }
    this.deleting = c;
    this.reassignTo = '';
  }
  confirmReassign(): void {
    if (!this.deleting || !this.reassignTo) return;
    const c = this.deleting;
    this.run(this.settings.deleteCategory(c.id, this.reassignTo), () => { this.deleting = null; this.flash('ticketing.categoriesSettings.deleted'); });
  }
  get reassignOptions(): CategorySetting[] { return this.rows.filter(r => r.active && r.id !== this.deleting?.id); }

  private run(request: import('rxjs').Observable<unknown>, done: () => void): void {
    this.saving = true;
    this.error = '';
    request.subscribe({
      next: () => { this.saving = false; done(); this.load(); },
      error: e => { this.saving = false; this.error = this.i18n.error(e, 'ticketing.categoriesSettings.couldNotSave'); }
    });
  }
  private flash(key: string): void { this.notice = this.i18n.t(key); setTimeout(() => this.notice = '', 2500); }
}
