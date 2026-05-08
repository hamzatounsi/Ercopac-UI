// Path: src/app/features/dashboard-crm/pages/crm-manager-view-page/crm-manager-view-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CrmService } from '../../services/crm.service';
import { CrmOpportunity, emptyOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';

@Component({
  selector: 'app-crm-manager-view-page',
  templateUrl: './crm-manager-view-page.component.html',
  styleUrls: ['./crm-manager-view-page.component.scss']
})
export class CrmManagerViewPageComponent implements OnInit {

  orgId = this.crmService.getOrgIdFromToken();
  opportunities: CrmOpportunity[] = [];
  stages: CrmPipelineStage[] = [];
  loading = false;

  activeTab: 'opportunities' | 'targets' | 'target-dashboard' = 'opportunities';
  stageFilter = 'All';
  teamMemberFilter = 'All members';

  // New opportunity modal
  showForm = false;
  saving = false;
  form: CrmOpportunity = emptyOpportunity();
  errorMsg = '';

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.load();
    this.crmService.getStages(this.orgId).subscribe({
      next: s => this.stages = s,
      error: err => console.error(err)
    });
  }

  load(): void {
    this.loading = true;
    this.crmService.getOpportunities(this.orgId).subscribe({
      next: d => { this.opportunities = d; this.loading = false; },
      error: err => { console.error(err); this.loading = false; }
    });
  }

  get stageFilters(): string[] {
    return ['All', ...this.stages.map(s => s.name)];
  }

  get owners(): string[] {
    const names = this.opportunities
      .map(o => o.ownerName || '')
      .filter(n => n);
    return ['All members', ...Array.from(new Set(names))];
  }

  get filtered(): CrmOpportunity[] {
    let list = [...this.opportunities];
    if (this.stageFilter !== 'All') {
      list = list.filter(o => o.stageName === this.stageFilter);
    }
    if (this.teamMemberFilter !== 'All members') {
      list = list.filter(o => o.ownerName === this.teamMemberFilter);
    }
    return list;
  }

  getOwnerInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  getOwnerColor(name: string | null): string {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];
    if (!name) return colors[0];
    return colors[name.charCodeAt(0) % colors.length];
  }

  formatValue(v: number | null): string {
    if (!v) return '—';
    return '€' + v.toLocaleString();
  }

  openAdd(): void {
    this.form = emptyOpportunity();
    this.errorMsg = '';
    this.showForm = true;
  }

  save(): void {
    if (!this.form.name?.trim()) { this.errorMsg = 'Name is required.'; return; }
    this.saving = true;
    this.crmService.createOpportunity(this.orgId, this.form).subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: err => { this.errorMsg = err?.error?.message ?? 'Error.'; this.saving = false; }
    });
  }

  cancel(): void { this.showForm = false; this.errorMsg = ''; }
}