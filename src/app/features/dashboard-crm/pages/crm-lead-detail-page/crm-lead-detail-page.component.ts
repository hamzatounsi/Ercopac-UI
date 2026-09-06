import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmActivity } from '../../models/crm-activity.model';
import { CrmLead, CrmLeadSource, CrmLeadStatus, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from '../../models/crm-lead.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmUser } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
import { CrmI18nService } from '../../services/crm-i18n.service'; // 👈 IMPORT I18N

@Component({
  selector: 'app-crm-lead-detail-page',
  templateUrl: './crm-lead-detail-page.component.html',
  styleUrls: ['./crm-lead-detail-page.component.scss']
})
export class CrmLeadDetailPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken();
  id = Number(this.route.snapshot.paramMap.get('id'));
  lead?: CrmLead;
  form?: CrmLead;
  accounts: CrmAccount[] = [];
  users: CrmUser[] = [];
  stages: CrmPipelineStage[] = [];
  opportunities: CrmOpportunity[] = [];
  activities: CrmActivity[] = [];
  loading = true;
  editing = false;
  editingNotes = false;
  loggingActivity = false;
  saving = false;
  newActivity = '';
  error = '';
  statusLabels = LEAD_STATUS_LABELS;
  statuses = Object.entries(LEAD_STATUS_LABELS).map(([value, item]) => ({ value: value as CrmLeadStatus, label: item.label }));

  constructor(
    private crm: CrmService,
    private route: ActivatedRoute,
    private router: Router,
    public permissions: CrmPermissionsService,
    public i18n: CrmI18nService // 👈 INJECT I18N
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      lead: this.crm.getLead(this.orgId, this.id),
      accounts: this.crm.getAccounts(this.orgId),
      users: this.crm.getCrmUsers(this.orgId),
      stages: this.crm.getStages(this.orgId),
      opps: this.crm.getOpportunities(this.orgId, { leadId: this.id }),
      activities: this.crm.getLeadActivities(this.orgId, this.id)
    }).subscribe({
      next: r => {
        this.lead = r.lead;
        this.form = { ...r.lead };
        this.accounts = r.accounts;
        this.users = r.users;
        this.stages = r.stages;
        this.opportunities = r.opps;
        this.activities = r.activities;
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message || this.i18n.t('leadDetail.error.notFound');
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.form) return;
    this.saving = true;
    this.crm.updateLead(this.orgId, this.id, this.form).subscribe({
      next: v => {
        this.lead = v;
        this.form = { ...v };
        this.editing = false;
        this.editingNotes = false;
        this.saving = false;
      },
      error: e => {
        this.error = e?.error?.message || this.i18n.t('leadDetail.error.save');
        this.saving = false;
      }
    });
  }

  setStatus(status: CrmLeadStatus): void {
    if (!this.form || !this.permissions.canWriteCrm) return;
    if (status === 'CONVERTED' && !this.lead?.converted) {
      this.convert();
      return;
    }
    this.form.status = status;
    this.save();
  }

  convert(): void {
    if (!this.permissions.canWriteCrm || this.lead?.converted) return;
    const stageId = this.stages[0]?.id || null;
    this.crm.convertLead(this.orgId, this.id, stageId).subscribe({
      next: o => this.router.navigate(['/crm/opportunities', o.id]),
      error: e => this.error = e?.error?.message || this.i18n.t('leadDetail.error.convert')
    });
  }

  remove(): void {
    // 👈 Use i18n for the confirmation dialog
    if (!confirm(this.i18n.t('leadDetail.confirmDelete'))) return;
    this.crm.deleteLead(this.orgId, this.id).subscribe({
      next: () => this.router.navigate(['/crm/leads']),
      error: e => this.error = e?.error?.message || this.i18n.t('leadDetail.error.delete')
    });
  }

  cancel(): void {
    if (this.lead) this.form = { ...this.lead };
    this.editing = false;
  }

  cancelNotes(): void {
    if (this.lead && this.form) this.form.notes = this.lead.notes;
    this.editingNotes = false;
  }

  saveNotes(): void {
    this.save();
  }

  addActivity(): void {
    const description = this.newActivity.trim();
    if (!description) return;
    this.crm.addLeadActivity(this.orgId, this.id, description).subscribe({
      next: value => {
        this.activities = [value, ...this.activities];
        this.newActivity = '';
        this.loggingActivity = false;
      },
      error: e => this.error = e?.error?.message || this.i18n.t('leadDetail.error.logActivity')
    });
  }

  get account(): CrmAccount | undefined {
    return this.accounts.find(item => item.id === this.lead?.accountId);
  }

sourceLabel(source: CrmLeadSource): string {
  const label = LEAD_SOURCE_LABELS[source] || source;
  return this.i18n.translateDynamic(label);
}

  initials(): string {
    return (this.lead?.fullName || '?').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase();
  }
}