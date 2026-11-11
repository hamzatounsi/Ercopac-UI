import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatContact, CustomerProject, FormOptions, ORIGIN_LABELS, TicketCategory, TicketOrigin, TicketPriority, UserSummary } from '../../models/ticket.models';
import { PickOption } from '../../components/select-or-manual/select-or-manual.component';
import { DirectChatService } from '../../services/direct-chat.service';
import { TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_STAFF_ROLES } from '../../ticketing-roles';
import { I18nService } from 'src/app/core/i18n/i18n.service';

// New ticket. Customer -> project, site and equipment of that customer (Settings > Customers).
// A client files under the customer their account is linked to; support staff choose the customer,
// the client account, the origin and can assign an H24 agent straight away. Staff can also enter a
// customer or project by hand (historical / external records); linked project data is read-only.
@Component({
  selector: 'app-ticket-create-page',
  templateUrl: './ticket-create-page.component.html',
  styleUrls: ['./ticket-create-page.component.scss']
})
export class TicketCreatePageComponent implements OnInit {
  get categories(): TicketCategory[] { return this.labels.categoryCodes; }
  readonly priorities: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly origins: TicketOrigin[] = ['PHONE', 'EMAIL', 'WEB', 'INTERNAL', 'OTHER'];
  readonly originLabels = ORIGIN_LABELS;
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);

  clients: ChatContact[] = [];
  agents: UserSummary[] = [];
  options: FormOptions = { customers: [], sites: [], equipment: [], projects: [] };
  loadingOptions = true;
  optionsError = '';
  customerManual = false;
  projectManual = false;
  form = {
    subject: '',
    description: '',
    category: 'SOFTWARE' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
    origin: (this.isStaff ? 'PHONE' : 'WEB') as TicketOrigin,
    customerId: null as number | null,
    site: '',
    projectId: null as number | null,
    equipmentId: null as number | null,
    clientUserId: null as number | null,
    assigneeId: null as number | null,
    customerName: '',
    projectName: '',
    projectNumber: '',
    projectYear: null as number | null,
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  };
  submitted = false;
  saving = false;
  error = '';

  constructor(private i18n: I18nService,
    private api: TicketService, private chat: DirectChatService, private auth: AuthService,
              public labels: TicketSettingsService, private router: Router) {}

  ngOnInit(): void {
    this.labels.load();
    this.loadOptions(null);
    if (this.isStaff) {
      this.chat.contacts().subscribe({ next: c => this.clients = c.filter(x => !x.staff), error: () => this.clients = [] });
      this.api.agents().subscribe({ next: a => this.agents = a, error: () => this.agents = [] });
    }
  }

  // Customer names are shown in upper case (display only: the search still matches any case)
  get customerOptions(): PickOption[] { return this.options.customers.map(c => ({ id: c.id, label: c.name.toUpperCase() })); }
  get projectOptions(): PickOption[] {
    return this.options.projects.map(p => ({ id: p.id, label: p.name, hint: [p.code, p.year].filter(v => v != null && v !== '').join(' · ') || undefined }));
  }

  /** Reloads the customer's sites, equipment and projects; clears choices that belonged to the previous customer. */
  loadOptions(customerId: number | null): void {
    this.loadingOptions = true;
    this.optionsError = '';
    this.api.formOptions(customerId).subscribe({
      next: o => {
        this.options = o;
        this.form.customerId = o.customerId ?? null;
        // A linked project stays when the new list still offers it (project picked before the customer)
        if (this.form.projectId != null && !o.projects.some(p => p.id === this.form.projectId)) this.selectProject(null);
        this.form.equipmentId = null;
        if (!o.sites.some(s => s.name === this.form.site)) this.form.site = '';
        this.loadingOptions = false;
      },
      error: e => { this.optionsError = this.i18n.error(e, 'ticketing.create.customerDataCouldNot'); this.loadingOptions = false; }
    });
  }

  setCustomerManual(on: boolean): void {
    this.customerManual = on;
    this.form.customerName = '';
    // A manual customer has no sites or equipment; projects come from the whole organisation
    if (on || this.form.customerId) this.loadOptions(null);
  }

  /** Linking a Projectum project copies its name, number and year (read-only). */
  selectProject(id: number | null): void {
    const p: CustomerProject | undefined = this.options.projects.find(x => x.id === id);
    this.form.projectId = p ? p.id : null;
    this.form.projectName = p?.name ?? '';
    this.form.projectNumber = p?.code ?? '';
    this.form.projectYear = p?.year ?? null;
  }

  setProjectManual(on: boolean): void {
    this.projectManual = on;
    this.selectProject(null);
  }

  onEquipment(id: number | null): void {
    // Picking equipment fills the site it is installed at
    const item = this.options.equipment.find(e => e.id === id);
    if (item?.siteName) this.form.site = item.siteName;
  }

  get subjectError(): string {
    const v = this.form.subject.trim();
    if (!v) return this.i18n.t('ticketing.create.subjectRequired');
    if (v.length < 5) return this.i18n.t('ticketing.create.useLeast5Characters');
    return '';
  }
  get descriptionError(): string {
    const v = this.form.description.trim();
    if (!v) return this.i18n.t('ticketing.create.describeProblem');
    if (v.length < 10) return this.i18n.t('ticketing.create.addBitMoreDetail');
    return '';
  }
  get customerError(): string { return this.customerManual && !this.form.customerName.trim() ? this.i18n.t('ticketing.create.enterCustomerNameChoose') : ''; }
  get projectError(): string { return this.projectManual && !this.form.projectName.trim() ? this.i18n.t('ticketing.create.enterProjectNameChoose') : ''; }
  get yearError(): string {
    const y = this.form.projectYear;
    return this.projectManual && y != null && (!Number.isInteger(+y) || +y < 1900 || +y > 2100) ? this.i18n.t('ticketing.create.yearMustBetween1900') : '';
  }
  get contactEmailError(): string {
    const v = this.form.contactEmail.trim();
    return v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? this.i18n.t('ticketing.create.invalidEmail') : '';
  }
  get contactPhoneError(): string {
    const v = this.form.contactPhone.trim();
    return v && !/^[0-9+()./ -]{3,60}$/.test(v) ? this.i18n.t('ticketing.create.invalidPhone') : '';
  }
  get valid(): boolean { return !this.subjectError && !this.descriptionError && !this.customerError && !this.projectError && !this.yearError && !this.contactEmailError && !this.contactPhoneError; }

  submit(): void {
    this.submitted = true;
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
      customerId: this.isStaff && !this.customerManual ? this.form.customerId : null,
      customerName: this.isStaff && this.customerManual ? this.form.customerName.trim() : null,
      projectId: this.projectManual ? null : this.form.projectId,
      projectName: this.projectManual ? this.form.projectName.trim() : null,
      projectNumber: this.projectManual ? this.form.projectNumber.trim() || null : null,
      projectYear: this.projectManual && this.form.projectYear != null ? +this.form.projectYear : null,
      equipmentId: this.form.equipmentId,
      clientUserId: this.isStaff ? this.form.clientUserId : null,
      contactName: this.form.contactName.trim() || null,
      contactEmail: this.form.contactEmail.trim() || null,
      contactPhone: this.form.contactPhone.trim() || null,
      assigneeId: this.isStaff ? this.form.assigneeId : null
    }).subscribe({
      next: created => void this.router.navigate(['/tickets', created.ticket.id]),
      error: e => { this.error = this.i18n.error(e, 'ticketing.create.ticketCouldNotCreated'); this.saving = false; }
    });
  }

  cancel(): void { void this.router.navigate(['/tickets']); }
  label(category: string): string { return this.labels.categoryLabel(category); }
}
