import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Contact, Customer, CustomerProject, Equipment, LANGUAGES, Ref, Site, UserSummary } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_LEAD_ROLES } from '../../ticketing-roles';

type Tab = 'info' | 'contacts' | 'sites' | 'equipment' | 'projects';
type Dialog = 'customer' | 'contact' | 'site' | 'equipment';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Customer companies served by the support team, with their contacts (and portal accounts), sites,
// installed equipment and Projectum projects. Staff can browse; leads create and edit.
@Component({
  selector: 'app-customers-settings',
  templateUrl: './customers-settings.component.html',
  styleUrls: ['./customers-settings.component.scss']
})
export class CustomersSettingsComponent implements OnInit {
  customers: Customer[] = [];
  selected?: Customer;
  tab: Tab = 'info';
  search = '';
  loading = true;
  error = '';
  notice = '';

  contacts: Contact[] = [];
  sites: Site[] = [];
  equipment: Equipment[] = [];
  projects: CustomerProject[] = [];
  tabLoading = false;
  tabError = '';

  equipmentTypes: Ref[] = [];
  portalUsers: UserSummary[] = [];

  dialog?: Dialog;
  form: any = {};
  submitted = false;
  saving = false;
  dialogError = '';

  readonly languages = LANGUAGES;
  readonly isLead = this.auth.hasAnyRole(TICKETING_LEAD_ROLES);
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Information' }, { key: 'contacts', label: 'Contacts' }, { key: 'sites', label: 'Sites' },
    { key: 'equipment', label: 'Equipment' }, { key: 'projects', label: 'Projects' }
  ];

  constructor(private settings: TicketSettingsService, private auth: AuthService) {}

  ngOnInit(): void { this.load(); }

  get filtered(): Customer[] {
    const q = this.search.trim().toLowerCase();
    return q ? this.customers.filter(c => [c.name, c.code, c.town, c.country].some(v => v?.toLowerCase().includes(q))) : this.customers;
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.settings.customers().subscribe({
      next: c => {
        this.customers = c;
        this.loading = false;
        if (this.selected) this.selected = c.find(x => x.id === this.selected!.id);
      },
      error: e => { this.loading = false; this.error = e.error?.message || 'Customers could not be loaded.'; }
    });
  }

  select(c: Customer): void {
    this.selected = c;
    this.tab = 'info';
  }

  back(): void { this.selected = undefined; }

  openTab(tab: Tab): void {
    this.tab = tab;
    this.loadTab();
  }

  loadTab(): void {
    const c = this.selected;
    if (!c || this.tab === 'info') return;
    this.tabLoading = true;
    this.tabError = '';
    const done = { error: (e: any) => { this.tabLoading = false; this.tabError = e.error?.message || 'This list could not be loaded.'; } };
    switch (this.tab) {
      case 'contacts': this.settings.contacts(c.id).subscribe({ ...done, next: v => { this.contacts = v; this.tabLoading = false; } }); break;
      case 'sites': this.settings.sites(c.id).subscribe({ ...done, next: v => { this.sites = v; this.tabLoading = false; } }); break;
      case 'equipment':
        // Sites feed the equipment form's site choice
        this.settings.sites(c.id).subscribe({ next: v => this.sites = v });
        this.settings.equipment(c.id).subscribe({ ...done, next: v => { this.equipment = v; this.tabLoading = false; } });
        break;
      case 'projects': this.settings.projects(c.id).subscribe({ ...done, next: v => { this.projects = v; this.tabLoading = false; } }); break;
    }
  }

  // ---------- dialogs ----------
  newCustomer(): void { this.openDialog('customer', { active: true }); }
  editCustomer(c: Customer): void { this.openDialog('customer', { ...c }); }

  editContact(c?: Contact): void {
    if (!this.portalUsers.length) this.settings.portalUsers().subscribe({ next: u => this.portalUsers = u });
    this.openDialog('contact', c ? { ...c, portalUserId: c.portalUser?.id ?? null } : { language: 'en', portalUserId: null });
  }

  editSite(s?: Site): void { this.openDialog('site', s ? { ...s } : {}); }

  editEquipment(e?: Equipment): void {
    if (!this.equipmentTypes.length) this.settings.equipmentTypes().subscribe({ next: t => this.equipmentTypes = t });
    this.openDialog('equipment', e ? { ...e } : { typeId: null, siteId: null });
  }

  closeDialog(): void { this.dialog = undefined; }

  get formError(): string {
    const f = this.form;
    switch (this.dialog) {
      case 'customer':
        if (!f.code?.trim() || !f.name?.trim()) return 'Code and name are required.';
        if (f.email && !EMAIL.test(f.email)) return 'Enter a valid email address.';
        return '';
      case 'contact':
        if (!f.fullName?.trim()) return 'A name is required.';
        if (f.email && !EMAIL.test(f.email)) return 'Enter a valid email address.';
        return '';
      case 'site': return f.name?.trim() ? '' : 'A site name is required.';
      case 'equipment': return f.name?.trim() ? '' : 'An equipment name is required.';
      default: return '';
    }
  }

  /** Portal accounts already linked to another contact cannot be picked again. */
  portalUserTaken(u: UserSummary): boolean {
    return this.contacts.some(c => c.portalUser?.id === u.id && c.id !== this.form.id);
  }

  saveDialog(): void {
    this.submitted = true;
    if (this.formError || !this.dialog) return;
    const c = this.selected;
    const f = this.trimmed(this.form);
    let request: Observable<unknown>;
    switch (this.dialog) {
      case 'customer': request = f.id ? this.settings.updateCustomer(f.id, f) : this.settings.createCustomer(f); break;
      case 'contact': request = this.settings.saveContact(c!.id, f); break;
      case 'site': request = this.settings.saveSite(c!.id, f); break;
      case 'equipment': request = this.settings.saveEquipment(c!.id, f); break;
    }
    const kind = this.dialog;
    this.saving = true;
    this.dialogError = '';
    request.subscribe({
      next: saved => {
        this.saving = false;
        this.dialog = undefined;
        if (kind === 'customer') {
          const customer = saved as Customer;
          this.selected = customer;
          if (!f.id) this.tab = 'info';
        } else {
          this.loadTab();
        }
        this.load();
        this.flash(f.id ? 'Changes saved' : 'Added');
      },
      error: e => { this.saving = false; this.dialogError = e.error?.message || 'This could not be saved.'; }
    });
  }

  remove(kind: 'contact' | 'site' | 'equipment', id: number, name: string): void {
    const c = this.selected;
    if (!c) return;
    const extra = kind === 'site' ? ' Equipment installed there stays registered without a site.' : '';
    if (!confirm(`Remove ${name}?${extra}`)) return;
    const request = kind === 'contact' ? this.settings.deleteContact(c.id, id) : kind === 'site' ? this.settings.deleteSite(c.id, id) : this.settings.deleteEquipment(c.id, id);
    request.subscribe({
      next: () => { this.loadTab(); this.load(); this.flash(`${name} removed`); },
      error: e => { this.tabError = e.error?.message || `${name} could not be removed.`; }
    });
  }

  location(c: Customer): string { return [c.town, c.country].filter(Boolean).join(', '); }
  languageName(code?: string): string { return LANGUAGES.find(l => l.code === code)?.label ?? '—'; }

  private openDialog(kind: Dialog, value: any): void {
    this.dialog = kind;
    this.form = value;
    this.submitted = false;
    this.dialogError = '';
  }

  private trimmed(f: any): any {
    const out: any = {};
    for (const [k, v] of Object.entries(f)) out[k] = typeof v === 'string' ? (v.trim() || null) : v;
    return out;
  }

  private flash(text: string): void { this.notice = text; setTimeout(() => this.notice = '', 2500); }
}
