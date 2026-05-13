// Path: src/app/features/dashboard-crm/pages/crm-dashboard-page/crm-dashboard-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CrmService } from '../../services/crm.service';
import { CrmDashboard } from '../../models/crm-dashboard.model';
import { CrmOpportunity, emptyOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { ACTIVITY_ICONS, CrmActivityType } from '../../models/crm-activity.model';

@Component({
  selector: 'app-crm-dashboard-page',
  templateUrl: './crm-dashboard-page.component.html',
  styleUrls: ['./crm-dashboard-page.component.scss']
})
export class CrmDashboardPageComponent implements OnInit {

  orgId: number = this.crmService.getOrgIdFromToken();
  dashboard: CrmDashboard | null = null;
  loading = false;
  activityIcons = ACTIVITY_ICONS;

  // All opportunities for pipeline kanban
  allOpportunities: CrmOpportunity[] = [];

  // New opportunity modal
  showNewOppModal = false;
  savingOpp = false;
  oppForm: CrmOpportunity = emptyOpportunity();
  stages: CrmPipelineStage[] = [];
  oppError = '';

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.load();
    this.loadStages();
    this.loadOpportunities();
  }

  load(): void {
    this.loading = true;
    this.crmService.getDashboard(this.orgId).subscribe({
      next: (data) => { this.dashboard = data; this.loading = false; },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  loadStages(): void {
    this.crmService.getStages(this.orgId).subscribe({
      next: s => this.stages = s,
      error: err => console.error(err)
    });
  }

  loadOpportunities(): void {
    this.crmService.getOpportunities(this.orgId).subscribe({
      next: o => this.allOpportunities = o,
      error: err => console.error(err)
    });
  }

  // Get opportunities for a specific stage
  getOppsForStage(stage: CrmPipelineStage): CrmOpportunity[] {
    return this.allOpportunities.filter(o =>
      o.stageId === stage.id && !o.lost
    );
  }

  // New opportunity modal
  openNewOpp(): void {
    this.oppForm = emptyOpportunity();
    if (this.stages.length > 0) this.oppForm.stageId = this.stages[0].id;
    this.oppError = '';
    this.showNewOppModal = true;
  }

  saveNewOpp(): void {
    if (!this.oppForm.name?.trim()) { this.oppError = 'Name is required.'; return; }
    this.savingOpp = true;
    this.crmService.createOpportunity(this.orgId, this.oppForm).subscribe({
      next: () => {
        this.savingOpp = false;
        this.showNewOppModal = false;
        this.load();
        this.loadOpportunities();
      },
      error: err => { this.oppError = err?.error?.message ?? 'Error.'; this.savingOpp = false; }
    });
  }

  cancelNewOpp(): void { this.showNewOppModal = false; this.oppError = ''; }

  // Formatting helpers
  formatValue(value: number | null): string {
    if (!value) return '—';
    if (value >= 1000000) return '€' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '€' + (value / 1000).toFixed(0) + 'K';
    return '€' + value.toLocaleString();
  }

  sourcePercent(source: string): number {
    if (!this.dashboard) return 0;
    const total = Object.values(this.dashboard.leadsBySource).reduce((a, b) => a + b, 0);
    return total ? Math.round(((this.dashboard.leadsBySource[source] || 0) / total) * 100) : 0;
  }

  sourceEntries(): { key: string; value: number }[] {
    if (!this.dashboard) return [];
    return Object.entries(this.dashboard.leadsBySource)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  sourceColor(source: string): string {
    const map: Record<string, string> = {
      REFERRAL: '#3b82f6', TRADE_FAIR: '#22c55e',
      AGENT: '#f59e0b', CUSTOMER: '#8b5cf6',
      PARTNER: '#06b6d4', OTHER: '#94a3b8'
    };
    return map[source] || '#94a3b8';
  }

  sourceLabel(source: string): string {
    const map: Record<string, string> = {
      REFERRAL: 'Referral', TRADE_FAIR: 'Trade fair',
      AGENT: 'Agent', CUSTOMER: 'Customer',
      PARTNER: 'Partner', OTHER: 'Other'
    };
    return map[source] || source;
  }

  getActivityColor(type: CrmActivityType): string {
    return this.activityIcons[type]?.color || '#94a3b8';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return 'Just now';
    if (h < 24) return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
    if (d === 1) return 'Yesterday';
    return d + ' days ago';
  }

  // Donut chart helpers
  get totalLeads(): number {
    if (!this.dashboard) return 0;
    return Object.values(this.dashboard.leadsBySource).reduce((a, b) => a + b, 0);
  }

  getDonutSegments(): { color: string; offset: number; dash: number }[] {
    if (!this.dashboard || this.totalLeads === 0) return [];
    const circumference = 2 * Math.PI * 40;
    let offset = 0;
    return this.sourceEntries().map(s => {
      const pct = s.value / this.totalLeads;
      const dash = pct * circumference;
      const seg = { color: this.sourceColor(s.key), offset: circumference - offset, dash };
      offset += dash;
      return seg;
    });
  }
}