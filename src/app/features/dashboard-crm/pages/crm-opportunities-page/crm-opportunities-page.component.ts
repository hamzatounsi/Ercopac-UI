// Path: src/app/features/dashboard-crm/pages/crm-opportunities-page/crm-opportunities-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CrmService } from '../../services/crm.service';
import { CrmOpportunity, emptyOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';

@Component({
  selector: 'app-crm-opportunities-page',
  templateUrl: './crm-opportunities-page.component.html',
  styleUrls: ['./crm-opportunities-page.component.scss']
})
export class CrmOpportunitiesPageComponent implements OnInit {

  orgId = this.crmService.getOrgIdFromToken();
  opportunities: CrmOpportunity[] = [];
  stages: CrmPipelineStage[] = [];
  loading = false;
  saving = false;

  showForm = false;
  editingId: number | null = null;
  form: CrmOpportunity = emptyOpportunity();
  errorMsg = '';

  stageFilter = 'All stages';

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

  openAdd(): void {
    this.form = emptyOpportunity();
    this.editingId = null;
    this.errorMsg = '';
    this.showForm = true;
  }

  openEdit(opp: CrmOpportunity): void {
    this.form = { ...opp };
    this.editingId = opp.id;
    this.errorMsg = '';
    this.showForm = true;
  }

  save(): void {
    if (!this.form.name?.trim()) { this.errorMsg = 'Name is required.'; return; }
    this.saving = true;
    const obs = this.editingId
      ? this.crmService.updateOpportunity(this.orgId, this.editingId, this.form)
      : this.crmService.createOpportunity(this.orgId, this.form);
    obs.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: err => { this.errorMsg = err?.error?.message ?? 'Error saving.'; this.saving = false; }
    });
  }

  markWon(opp: CrmOpportunity): void {
    this.crmService.markWon(this.orgId, opp.id!).subscribe({ next: () => this.load() });
  }

  markLost(opp: CrmOpportunity): void {
    this.crmService.markLost(this.orgId, opp.id!).subscribe({ next: () => this.load() });
  }

  delete(opp: CrmOpportunity): void {
    if (!confirm(`Delete "${opp.name}"?`)) return;
    this.crmService.deleteOpportunity(this.orgId, opp.id!).subscribe({ next: () => this.load() });
  }

  cancel(): void { this.showForm = false; this.errorMsg = ''; }

  get stageFilters(): string[] {
    return ['All stages', ...this.stages.filter(s => !s.lost).map(s => s.name)];
  }

  get filteredOpportunities(): CrmOpportunity[] {
    if (this.stageFilter === 'All stages') return this.opportunities;
    return this.opportunities.filter(o => o.stageName === this.stageFilter);
  }

  formatValue(v: number | null): string {
    if (!v) return '—';
    return '€' + v.toLocaleString();
  }
}