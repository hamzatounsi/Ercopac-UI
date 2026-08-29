import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CrmManagerTeamMember, CrmManagerView } from '../../models/crm-detail.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmService } from '../../services/crm.service';

@Component({ selector: 'app-crm-manager-view-page', templateUrl: './crm-manager-view-page.component.html', styleUrls: ['./crm-manager-view-page.component.scss'] })
export class CrmManagerViewPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); year = new Date().getFullYear(); data?: CrmManagerView; stages: CrmPipelineStage[] = []; loading = true;
  active: 'opportunities' | 'targets' | 'dashboard' = 'opportunities'; view: 'list' | 'board' = 'list'; targetView: 'list' | 'chart' = 'list'; ownerId: number | null = null; stageId: number | null = null; error = '';
  constructor(private crm: CrmService, private router: Router) {}
  ngOnInit(): void { this.crm.getStages(this.orgId).subscribe(stages => this.stages = stages); this.load(); }
  load(): void { this.loading = true; this.crm.getManagerView(this.orgId, this.year).subscribe({ next: data => { this.data = data; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Manager View is not available.'; this.loading = false; } }); }
  get opportunities(): CrmOpportunity[] { return (this.data?.opportunities || []).filter(item => (!this.ownerId || item.ownerId === this.ownerId) && (!this.stageId || item.stageId === this.stageId)); }
  byStage(id: number | null): CrmOpportunity[] { return this.opportunities.filter(item => item.stageId === id); }
  open(opportunity: CrmOpportunity): void { this.router.navigate(['/crm/opportunities', opportunity.id]); }
  money(value: number, currency = 'EUR'): string { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0); }
  saveTarget(member: CrmManagerTeamMember): void { this.crm.saveTarget(this.orgId, member.userId, this.year, member.target, member.currency).subscribe({ next: () => this.load(), error: error => this.error = error?.error?.message || 'Unable to save target.' }); }
  progress(member: CrmManagerTeamMember): number { return member.target ? Math.min(100, Math.round(member.wonValue / member.target * 100)) : 0; }
  get totalTarget(): number { return (this.data?.team || []).reduce((sum, member) => sum + member.target, 0); }
  get totalWon(): number { return (this.data?.team || []).reduce((sum, member) => sum + member.wonValue, 0); }
  get totalPipeline(): number { return (this.data?.team || []).reduce((sum, member) => sum + member.pipelineValue, 0); }
  get attainment(): number { return this.totalTarget ? Math.round(this.totalWon / this.totalTarget * 100) : 0; }
  get maxTarget(): number { return Math.max(1, ...(this.data?.team || []).map(member => Math.max(member.target, member.wonValue))); }
}
