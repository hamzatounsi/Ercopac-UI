import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/config/api.config';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { AccountKind, Agent, Ref, ResourceTypeOption } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';

// Support leads create accounts for new employees: H24 agents / leads, or L2 technicians (employee with a
// department and a resource type, flagged L2). The backend reuses the organisation user creation (licences,
// password policy) in the lead's organisation. Route and nav entry are lead-only.
@Component({
  selector: 'app-accounts-settings',
  templateUrl: './accounts-settings.component.html',
  styleUrls: ['./accounts-settings.component.scss']
})
export class AccountsSettingsComponent implements OnInit {
  readonly kinds: { key: AccountKind; label: string }[] = [
    { key: 'H24', label: 'ticketing.accounts.kindH24' },
    { key: 'H24_LEAD', label: 'ticketing.accounts.kindLead' },
    { key: 'TECHNICIAN', label: 'ticketing.accounts.kindTechnician' }
  ];
  form = { fullName: '', email: '', password: '', kind: 'H24' as AccountKind, departmentId: null as number | null, resourceTypeId: null as number | null, specialization: '' };
  departments: Ref[] = [];
  resourceTypes: ResourceTypeOption[] = [];
  submitted = false;
  saving = false;
  error = '';
  created: Agent[] = [];

  constructor(private settings: TicketSettingsService, private http: HttpClient, private i18n: I18nService) {}

  ngOnInit(): void {
    this.settings.resourceTypes().subscribe({ next: t => this.resourceTypes = t, error: () => this.resourceTypes = [] });
    this.http.get<Ref[]>(`${API_BASE_URL}/tickets/settings/departments`).subscribe({ next: d => this.departments = d, error: () => this.departments = [] });
  }

  get technician(): boolean { return this.form.kind === 'TECHNICIAN'; }
  get emailValid(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim()); }
  get valid(): boolean {
    return !!this.form.fullName.trim() && this.emailValid && this.form.password.length >= 8
      && (!this.technician || (this.form.departmentId != null && this.form.resourceTypeId != null));
  }

  submit(): void {
    this.submitted = true;
    if (!this.valid || this.saving) return;
    this.saving = true;
    this.error = '';
    this.settings.createAccount({
      fullName: this.form.fullName.trim(), email: this.form.email.trim(), password: this.form.password, kind: this.form.kind,
      departmentId: this.technician ? this.form.departmentId : null, resourceTypeId: this.technician ? this.form.resourceTypeId : null,
      specialization: this.form.specialization.trim() || null
    }).subscribe({
      next: a => {
        this.created.unshift(a);
        this.form = { fullName: '', email: '', password: '', kind: this.form.kind, departmentId: null, resourceTypeId: null, specialization: '' };
        this.submitted = false;
        this.saving = false;
      },
      error: e => { this.error = this.i18n.error(e, 'ticketing.accounts.couldNotCreate'); this.saving = false; }
    });
  }
}
