// Path: src/app/features/dashboard-crm/pages/crm-leads-page/crm-leads-page.component.ts

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_RESOURCES_URL } from 'src/app/core/config/api.config';
import { CrmService } from '../../services/crm.service';
import {
  CrmLead, CrmLeadStatus, CrmLeadSource,
  LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, emptyLead
} from '../../models/crm-lead.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';

interface OrgUser {
  id: number;
  fullName: string;
}

@Component({
  selector: 'app-crm-leads-page',
  templateUrl: './crm-leads-page.component.html',
  styleUrls: ['./crm-leads-page.component.scss']
})
export class CrmLeadsPageComponent implements OnInit {

  orgId = this.crmService.getOrgIdFromToken();
  leads: CrmLead[] = [];
  stages: CrmPipelineStage[] = [];
  users: OrgUser[] = [];
  loading = false;
  saving = false;

  showForm = false;
  editingId: number | null = null;
  form: CrmLead = emptyLead();
  errorMsg = '';

  showConvertModal = false;
  convertingLeadId: number | null = null;
  selectedStageId: number | null = null;

  activeFilter: 'ALL' | 'CONVERTED' | 'NOT_CONTACTED' = 'ALL';

  sourceLabels = LEAD_SOURCE_LABELS;
  statusLabels = LEAD_STATUS_LABELS;

  readonly sources: CrmLeadSource[] = [
    'REFERRAL', 'TRADE_FAIR', 'AGENT', 'CUSTOMER', 'PARTNER', 'OTHER'
  ];

  readonly statuses: CrmLeadStatus[] = [
    'NOT_CONTACTED', 'CONTACTED', 'CONTACT_IN_FUTURE', 'CONVERTED'
  ];

  constructor(
    private crmService: CrmService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadStages();
    this.loadUsers();
  }

  load(): void {
    this.loading = true;
    const status = this.activeFilter !== 'ALL' ? this.activeFilter : undefined;
    this.crmService.getLeads(this.orgId, undefined, status).subscribe({
      next: d => { this.leads = d; this.loading = false; },
      error: err => { console.error(err); this.loading = false; }
    });
  }

  loadStages(): void {
    this.crmService.getStages(this.orgId).subscribe({
      next: s => this.stages = s,
      error: err => console.error(err)
    });
  }

  loadUsers(): void {
    this.http.get<OrgUser[]>(`${API_RESOURCES_URL}/options`).subscribe({
      next: users => this.users = users,
      error: err => console.error('Could not load users', err)
    });
  }

  setFilter(f: 'ALL' | 'CONVERTED' | 'NOT_CONTACTED'): void {
    this.activeFilter = f;
    this.load();
  }

  // ── Inline owner update ───────────────────────────────────
  updateOwner(lead: CrmLead): void {
    this.crmService.updateLead(this.orgId, lead.id!, lead).subscribe({
      next: updated => {
        const idx = this.leads.findIndex(l => l.id === lead.id);
        if (idx >= 0) this.leads[idx] = updated;
      },
      error: err => console.error(err)
    });
  }

  // ── Get current user name from JWT ────────────────────────
  get currentUserName(): string {
    try {
      const token = localStorage.getItem('token')
                 ?? localStorage.getItem('access_token')
                 ?? localStorage.getItem('jwt');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.fullName ?? payload.name ?? payload.sub ?? '';
    } catch { return ''; }
  }

  // ── Get current user id from JWT ──────────────────────────
  get currentUserId(): number {
    try {
      const token = localStorage.getItem('token')
                 ?? localStorage.getItem('access_token')
                 ?? localStorage.getItem('jwt');
      if (!token) return 0;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId ?? payload.id ?? 0;
    } catch { return 0; }
  }

  openAdd(): void {
    this.form = emptyLead();
    // Pre-fill owner with current user
    this.form.ownerId = this.currentUserId;
    this.editingId = null;
    this.errorMsg = '';
    this.showForm = true;
  }

  openEdit(lead: CrmLead): void {
    this.form = { ...lead };
    this.editingId = lead.id;
    this.errorMsg = '';
    this.showForm = true;
  }

  save(): void {
    if (!this.form.fullName?.trim()) { this.errorMsg = 'Name is required.'; return; }
    this.saving = true;
    const obs = this.editingId
      ? this.crmService.updateLead(this.orgId, this.editingId, this.form)
      : this.crmService.createLead(this.orgId, this.form);
    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: err => { this.errorMsg = err?.error?.message ?? 'Error saving.'; this.saving = false; }
    });
  }

  delete(lead: CrmLead): void {
    if (!confirm(`Delete lead "${lead.fullName}"?`)) return;
    this.crmService.deleteLead(this.orgId, lead.id!).subscribe({ next: () => this.load() });
  }

  openConvert(lead: CrmLead): void {
    this.convertingLeadId = lead.id;
    this.selectedStageId = this.stages[0]?.id ?? null;
    this.showConvertModal = true;
  }

  confirmConvert(): void {
    if (!this.convertingLeadId) return;
    this.crmService.convertLead(this.orgId, this.convertingLeadId, this.selectedStageId).subscribe({
      next: () => { this.showConvertModal = false; this.load(); },
      error: err => console.error(err)
    });
  }

  cancel(): void { this.showForm = false; this.errorMsg = ''; }
}

