import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead } from '../../models/crm-lead.model';
import { CrmOpportunity, emptyOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmSupplyCategory, CrmUser } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
import { CrmI18nService } from '../../services/crm-i18n.service'; // 👈 IMPORT I18N

@Component({
  selector: 'app-crm-opportunities-page',
  templateUrl: './crm-opportunities-page.component.html',
  styleUrls: ['./crm-opportunities-page.component.scss']
})
export class CrmOpportunitiesPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken();
  opportunities: CrmOpportunity[] = [];
  stages: CrmPipelineStage[] = [];
  accounts: CrmAccount[] = [];
  categories: CrmSupplyCategory[] = [];
  users: CrmUser[] = [];
  contacts: CrmLead[] = [];
  loading = true;
  stageFilter: number | null = null;
  search = '';
  showForm = false;
  saving = false;
  form = emptyOpportunity();
  error = '';

  constructor(
    private crm: CrmService,
    private router: Router,
    public permissions: CrmPermissionsService,
    public i18n: CrmI18nService // 👈 INJECT I18N
  ) {}

  ngOnInit(): void {
    forkJoin({
      stages: this.crm.getStages(this.orgId),
      accounts: this.crm.getAccounts(this.orgId),
      categories: this.crm.getOrganisationCategories(this.orgId),
      users: this.crm.getCrmUsers(this.orgId)
    }).subscribe({
      next: v => {
        this.stages = v.stages;
        this.accounts = v.accounts;
        this.categories = v.categories;
        this.users = v.users;
      },
      error: e => this.error = e?.error?.message || this.i18n.t('opportunities.error.loadFormData')
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.crm.getOpportunities(this.orgId, this.stageFilter ? { stageId: this.stageFilter } : {}).subscribe({
      next: v => {
        this.opportunities = v;
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message || this.i18n.t('opportunities.error.load');
        this.loading = false;
      }
    });
  }

  get filtered(): CrmOpportunity[] {
    const q = this.search.toLowerCase().trim();
    return q
      ? this.opportunities.filter(o => o.name.toLowerCase().includes(q) || (o.accountName || '').toLowerCase().includes(q))
      : this.opportunities;
  }

  setStage(id: number | null): void {
    this.stageFilter = id;
    this.load();
  }

  open(v: CrmOpportunity): void {
    this.router.navigate(['/crm/opportunities', v.id]);
  }

  openNew(): void {
    this.form = emptyOpportunity();
    this.form.stageId = this.stages[0]?.id || null;
    this.form.probability = this.stages[0]?.probability || 0;
    if (this.permissions.hasOwnOpportunityScope) this.form.ownerId = this.permissions.currentUserId;
    this.showForm = true;
    this.error = '';
    this.contacts = [];
  }

  stageChanged(): void {
    this.form.probability = this.stages.find(stage => stage.id === this.form.stageId)?.probability || 0;
  }

  accountChanged(): void {
    this.form.leadId = null;
    this.contacts = [];
    if (this.form.accountId) {
      this.crm.getLeads(this.orgId, undefined, undefined, this.form.accountId).subscribe(v => this.contacts = v);
    }
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.accountId) {
      this.error = this.i18n.t('opportunities.error.required');
      return;
    }
    if (this.form.probability < 0 || this.form.probability > 100) {
      this.error = this.i18n.t('opportunities.error.probability');
      return;
    }
    if (this.form.discount < 0 || this.form.discount > 100) {
      this.error = this.i18n.t('opportunities.error.discount');
      return;
    }
    if (this.hasSalesSplit && this.cents(this.totalSalesSplit) !== this.cents(this.totalValue)) {
      this.error = this.i18n.t('opportunities.error.salesSplit');
      return;
    }
    if (this.hasResaleSplit && this.cents(this.totalResaleSplit) !== this.cents(this.totalValue)) {
      this.error = this.i18n.t('opportunities.error.resaleSplit');
      return;
    }
    this.form.value = this.totalValue;
    this.saving = true;
    this.crm.createOpportunity(this.orgId, this.form).subscribe({
      next: v => {
        this.saving = false;
        this.showForm = false;
        this.router.navigate(['/crm/opportunities', v.id]);
      },
      error: e => {
        this.error = e?.error?.message || this.i18n.t('opportunities.error.create');
        this.saving = false;
      }
    });
  }

  private cents(value: number | null | undefined): number {
    return Math.round((Number(value) || 0) * 100);
  }

  get totalValue(): number {
    return (this.cents(this.form.materialValue) + this.cents(this.form.servicesValue)) / 100;
  }

  get totalSalesSplit(): number {
    return (this.cents(this.form.ercopacMaterialValue) + this.cents(this.form.thirdPartyMaterialValue)) / 100;
  }

  get totalResaleSplit(): number {
    return (this.cents(this.form.ercopacResaleValue) + this.cents(this.form.resaleValue)) / 100;
  }

  get hasSalesSplit(): boolean {
    return this.form.ercopacMaterialValue != null || this.form.thirdPartyMaterialValue != null;
  }

  get hasResaleSplit(): boolean {
    return this.form.ercopacResaleValue != null || this.form.resaleValue != null;
  }

  money(v: number | null, c = 'EUR'): string {
    return v ? new Intl.NumberFormat('en', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v) : '—';
  }
}