import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CrmPipelineStage, emptyStage } from '../../models/crm-pipeline-stage.model';
import { CrmIndustry, CrmNotificationPreference } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';

@Component({ selector: 'app-crm-settings-page', templateUrl: './crm-settings-page.component.html', styleUrls: ['./crm-settings-page.component.scss'] })
export class CrmSettingsPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); active: 'pipeline' | 'industry' | 'notifications' = 'pipeline'; stages: CrmPipelineStage[] = []; industries: CrmIndustry[] = []; newStage = emptyStage(); newIndustry: CrmIndustry = { id: null, name: '', active: true };
  preferences: CrmNotificationPreference = { emailNotifications: true, stageChangeAlerts: true, closingDateReminders: false };
  addingStage = false; addingIndustry = false; loading = true; savingPreferences = false; error = ''; toast = '';
  constructor(private crm: CrmService, public permissions: CrmPermissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void { forkJoin({ stages: this.crm.getStages(this.orgId), industries: this.crm.getIndustries(this.orgId, true), preferences: this.crm.getNotificationPreferences(this.orgId) }).subscribe({ next: result => { this.stages = result.stages; this.industries = result.industries; this.preferences = result.preferences; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Unable to load CRM settings.'; this.loading = false; } }); }
  saveStage(stage: CrmPipelineStage): void { if (!stage.id) return; this.crm.updateStage(this.orgId, stage.id, stage).subscribe({ next: () => this.flash('Pipeline stage saved'), error: error => this.error = error?.error?.message || 'Unable to save stage.' }); }
  addStage(): void { if (!this.newStage.name.trim()) return; this.newStage.displayOrder = this.stages.length; this.crm.createStage(this.orgId, this.newStage).subscribe({ next: stage => { this.stages = [...this.stages, stage]; this.newStage = emptyStage(); this.addingStage = false; this.flash('Pipeline stage added'); }, error: error => this.error = error?.error?.message || 'Unable to add stage.' }); }
  deleteStage(stage: CrmPipelineStage): void { if (!stage.id || !confirm('Delete this stage?')) return; this.crm.deleteStage(this.orgId, stage.id).subscribe({ next: () => this.stages = this.stages.filter(value => value.id !== stage.id), error: error => this.error = error?.error?.message || 'Unable to delete stage.' }); }
  saveIndustry(industry: CrmIndustry): void { if (!industry.id) return; this.crm.updateIndustry(this.orgId, industry.id, industry).subscribe({ next: value => { Object.assign(industry, value); this.flash('Industry saved'); }, error: error => this.error = error?.error?.message || 'Unable to save industry.' }); }
  addIndustry(): void { if (!this.newIndustry.name.trim()) return; this.crm.createIndustry(this.orgId, this.newIndustry).subscribe({ next: value => { this.industries = [...this.industries, value].sort((a, b) => a.name.localeCompare(b.name)); this.newIndustry = { id: null, name: '', active: true }; this.addingIndustry = false; this.flash('Industry added'); }, error: error => this.error = error?.error?.message || 'Unable to add industry.' }); }
  deleteIndustry(industry: CrmIndustry): void { if (!industry.id || !confirm('Delete this industry?')) return; this.crm.deleteIndustry(this.orgId, industry.id).subscribe({ next: () => { this.industries = this.industries.filter(value => value.id !== industry.id); this.flash('Industry deleted'); }, error: error => this.error = error?.error?.message || 'Unable to delete industry.' }); }
  savePreferences(): void { if (this.savingPreferences) return; this.savingPreferences = true; this.crm.saveNotificationPreferences(this.orgId, this.preferences).subscribe({ next: value => { this.preferences = value; this.savingPreferences = false; this.flash('Notification preferences saved'); }, error: error => { this.error = error?.error?.message || 'Unable to save notification preferences.'; this.savingPreferences = false; } }); }
  private flash(value: string): void { this.toast = value; setTimeout(() => this.toast = '', 2000); }
}
