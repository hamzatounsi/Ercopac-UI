import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ACTIVITY_ICONS, CrmActivityType } from '../../models/crm-activity.model';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmDashboard } from '../../models/crm-dashboard.model';
import { CrmOpportunity, emptyOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({ selector: 'app-crm-dashboard-page', templateUrl: './crm-dashboard-page.component.html', styleUrls: ['./crm-dashboard-page.component.scss'] })
export class CrmDashboardPageComponent implements OnInit {
  orgId = this.crmService.getOrgIdFromToken();
  dashboard: CrmDashboard | null = null;
  loading = false;
  error = '';
  activityIcons = ACTIVITY_ICONS;
  allOpportunities: CrmOpportunity[] = [];
  accounts: CrmAccount[] = [];
  stages: CrmPipelineStage[] = [];
  showNewOppModal = false;
  savingOpp = false;
  oppForm: CrmOpportunity = emptyOpportunity();
  oppError = '';

  constructor(private crmService: CrmService, private router: Router, public permissions: CrmPermissionsService, private auth: AuthService) {}
  get currentUserName(): string { return this.auth.getCurrentUsername() || 'there'; }
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({ dashboard: this.crmService.getDashboard(this.orgId), opportunities: this.crmService.getOpportunities(this.orgId), stages: this.crmService.getStages(this.orgId), accounts: this.crmService.getAccounts(this.orgId) }).subscribe({
      next: result => { this.dashboard = result.dashboard; this.allOpportunities = result.opportunities; this.stages = result.stages; this.accounts = result.accounts; this.loading = false; },
      error: err => { this.error = err?.error?.message || 'Unable to load the CRM dashboard.'; this.loading = false; }
    });
  }

  getOppsForStage(stage: CrmPipelineStage): CrmOpportunity[] { return this.allOpportunities.filter(opportunity => opportunity.stageId === stage.id && !opportunity.lost); }
  openNewOpp(): void { this.oppForm = emptyOpportunity(); this.oppForm.stageId = this.stages[0]?.id ?? null; this.oppForm.probability = this.stages[0]?.probability ?? 0; this.oppForm.accountId = this.accounts[0]?.id ?? null; if (this.permissions.hasOwnOpportunityScope) this.oppForm.ownerId = this.permissions.currentUserId; this.oppError = ''; this.showNewOppModal = true; }
  newOpportunityStageChanged(): void { this.oppForm.probability = this.stages.find(stage => stage.id === this.oppForm.stageId)?.probability ?? 0; }
  saveNewOpp(): void {
    if (!this.oppForm.name.trim()) { this.oppError = 'Opportunity name is required.'; return; }
    if (!this.oppForm.accountId) { this.oppError = 'Select an account.'; return; }
    if ((this.oppForm.materialValue || 0) < 0 || (this.oppForm.servicesValue || 0) < 0) { this.oppError = 'Material and services cannot be negative.'; return; }
    if (this.oppForm.discount < 0 || this.oppForm.discount > 100) { this.oppError = 'Discount must be between 0 and 100.'; return; }
    this.oppForm.value = (Math.round((this.oppForm.materialValue || 0) * 100) + Math.round((this.oppForm.servicesValue || 0) * 100)) / 100;
    this.savingOpp = true;
    this.crmService.createOpportunity(this.orgId, this.oppForm).subscribe({
      next: opportunity => { this.savingOpp = false; this.showNewOppModal = false; this.router.navigate(['/crm/opportunities', opportunity.id]); },
      error: err => { this.oppError = err?.error?.message || 'Unable to create the opportunity.'; this.savingOpp = false; }
    });
  }
  cancelNewOpp(): void { this.showNewOppModal = false; this.oppError = ''; }

  formatValue(value: number | null): string { if (!value) return '—'; if (value >= 1_000_000) return '€' + (value / 1_000_000).toFixed(1) + 'M'; if (value >= 1_000) return '€' + (value / 1_000).toFixed(0) + 'K'; return '€' + value.toLocaleString(); }
  sourcePercent(source: string): number { if (!this.dashboard) return 0; const total = Object.values(this.dashboard.leadsBySource).reduce((a, b) => a + b, 0); return total ? Math.round(((this.dashboard.leadsBySource[source] || 0) / total) * 100) : 0; }
  sourceEntries(): { key: string; value: number }[] { return this.dashboard ? Object.entries(this.dashboard.leadsBySource).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value) : []; }
  sourceColor(source: string): string { return ({ REFERRAL: '#3b82f6', TRADE_FAIR: '#22c55e', AGENT: '#f59e0b', CUSTOMER: '#8b5cf6', PARTNER: '#06b6d4', OTHER: '#94a3b8' } as Record<string, string>)[source] || '#94a3b8'; }
  sourceLabel(source: string): string { return ({ REFERRAL: 'Referral', TRADE_FAIR: 'Trade fair', AGENT: 'Agent', CUSTOMER: 'Customer', PARTNER: 'Partner', OTHER: 'Other' } as Record<string, string>)[source] || source; }
  getActivityColor(type: CrmActivityType): string { return this.activityIcons[type]?.color || '#94a3b8'; }
  timeAgo(dateStr: string): string { const difference = Date.now() - new Date(dateStr).getTime(); const hours = Math.floor(difference / 3_600_000); const days = Math.floor(difference / 86_400_000); if (hours < 1) return 'Just now'; if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`; return days === 1 ? 'Yesterday' : `${days} days ago`; }
  get totalLeads(): number { return this.dashboard ? Object.values(this.dashboard.leadsBySource).reduce((a, b) => a + b, 0) : 0; }
  getDonutSegments(): { color: string; offset: number; dash: number }[] { if (!this.dashboard || !this.totalLeads) return []; const circumference = 2 * Math.PI * 40; let offset = 0; return this.sourceEntries().map(source => { const dash = (source.value / this.totalLeads) * circumference; const segment = { color: this.sourceColor(source.key), offset: circumference - offset, dash }; offset += dash; return segment; }); }
}
