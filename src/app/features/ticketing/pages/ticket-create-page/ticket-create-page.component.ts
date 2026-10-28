import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ChatContact, FormOptions, ORIGIN_LABELS, TicketCategory, TicketOrigin, TicketPriority, UserSummary } from '../../models/ticket.models';
import { DirectChatService } from '../../services/direct-chat.service';
import { TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { TICKETING_STAFF_ROLES } from '../../ticketing-roles';

// New ticket. Customer -> project, site and equipment of that customer (Settings > Customers).
// A client files under the customer their account is linked to; support staff choose the customer,
// the client account, the origin and can assign an H24 agent straight away.
@Component({
  selector: 'app-ticket-create-page',
  templateUrl: './ticket-create-page.component.html',
  styleUrls: ['./ticket-create-page.component.scss']
})
export class TicketCreatePageComponent implements OnInit {
  readonly categories: TicketCategory[] = ['SOFTWARE', 'ACCESS', 'PERFORMANCE', 'BILLING', 'DATA', 'INTEGRATION', 'FEATURE_REQUEST', 'OTHER'];
  readonly priorities: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly origins: TicketOrigin[] = ['PHONE', 'EMAIL', 'WEB', 'INTERNAL', 'OTHER'];
  readonly originLabels = ORIGIN_LABELS;
  readonly isStaff = this.auth.hasAnyRole(TICKETING_STAFF_ROLES);

  clients: ChatContact[] = [];
  agents: UserSummary[] = [];
  options: FormOptions = { customers: [], sites: [], equipment: [], projects: [] };
  loadingOptions = true;
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
    assigneeId: null as number | null
  };
  submitted = false;
  saving = false;
  error = '';

  constructor(private api: TicketService, private chat: DirectChatService, private auth: AuthService,
              public labels: TicketSettingsService, private router: Router) {}

  ngOnInit(): void {
    this.loadOptions(null);
    if (this.isStaff) {
      this.chat.contacts().subscribe({ next: c => this.clients = c.filter(x => !x.staff), error: () => this.clients = [] });
      this.api.agents().subscribe({ next: a => this.agents = a, error: () => this.agents = [] });
    }
  }

  /** Reloads the customer's sites, equipment and projects; clears choices that belonged to the previous customer. */
  loadOptions(customerId: number | null): void {
    this.loadingOptions = true;
    this.api.formOptions(customerId).subscribe({
      next: o => {
        this.options = o;
        this.form.customerId = o.customerId ?? null;
        this.form.projectId = null;
        this.form.equipmentId = null;
        if (!o.sites.some(s => s.name === this.form.site)) this.form.site = '';
        this.loadingOptions = false;
      },
      error: e => { this.error = e.error?.message || 'Customer data could not be loaded.'; this.loadingOptions = false; }
    });
  }

  onEquipment(id: number | null): void {
    // Picking equipment fills the site it is installed at
    const item = this.options.equipment.find(e => e.id === id);
    if (item?.siteName) this.form.site = item.siteName;
  }

  get subjectError(): string {
    const v = this.form.subject.trim();
    if (!v) return 'Subject is required.';
    if (v.length < 5) return 'Use at least 5 characters.';
    return '';
  }
  get descriptionError(): string {
    const v = this.form.description.trim();
    if (!v) return 'Describe the problem.';
    if (v.length < 10) return 'Add a bit more detail (10 characters or more).';
    return '';
  }
  get valid(): boolean { return !this.subjectError && !this.descriptionError; }

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
      customerId: this.isStaff ? this.form.customerId : null,
      projectId: this.form.projectId,
      equipmentId: this.form.equipmentId,
      clientUserId: this.isStaff ? this.form.clientUserId : null,
      assigneeId: this.isStaff ? this.form.assigneeId : null
    }).subscribe({
      next: created => void this.router.navigate(['/tickets', created.ticket.id]),
      error: e => { this.error = e.error?.message || 'Ticket could not be created.'; this.saving = false; }
    });
  }

  cancel(): void { void this.router.navigate(['/tickets']); }
  label(v: string): string { return v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()); }
}
