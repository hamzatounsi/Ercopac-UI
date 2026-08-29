import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CrmPipelineStage, emptyStage } from '../../models/crm-pipeline-stage.model';
import { CrmNotificationPreference } from '../../models/crm-detail.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';

@Component({ selector: 'app-crm-settings-page', templateUrl: './crm-settings-page.component.html', styleUrls: ['./crm-settings-page.component.scss'] })
export class CrmSettingsPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); active: 'pipeline' | 'notifications' = 'pipeline'; stages: CrmPipelineStage[] = []; newStage = emptyStage();
  preferences: CrmNotificationPreference = { emailNotifications: true, stageChangeAlerts: true, closingDateReminders: false };
  addingStage = false; loading = true; savingPreferences = false; error = ''; toast = '';
  constructor(private crm: CrmService, public permissions: CrmPermissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void { forkJoin({ stages: this.crm.getStages(this.orgId), preferences: this.crm.getNotificationPreferences(this.orgId) }).subscribe({ next: result => { this.stages = result.stages; this.preferences = result.preferences; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Unable to load CRM settings.'; this.loading = false; } }); }
  saveStage(stage: CrmPipelineStage): void { if (!stage.id) return; this.crm.updateStage(this.orgId, stage.id, stage).subscribe({ next: () => this.flash('Pipeline stage saved'), error: error => this.error = error?.error?.message || 'Unable to save stage.' }); }
  addStage(): void { if (!this.newStage.name.trim()) return; this.newStage.displayOrder = this.stages.length; this.crm.createStage(this.orgId, this.newStage).subscribe({ next: stage => { this.stages = [...this.stages, stage]; this.newStage = emptyStage(); this.addingStage = false; this.flash('Pipeline stage added'); }, error: error => this.error = error?.error?.message || 'Unable to add stage.' }); }
  deleteStage(stage: CrmPipelineStage): void { if (!stage.id || !confirm('Delete this stage?')) return; this.crm.deleteStage(this.orgId, stage.id).subscribe({ next: () => this.stages = this.stages.filter(value => value.id !== stage.id), error: error => this.error = error?.error?.message || 'Unable to delete stage.' }); }
  savePreferences(): void { if (this.savingPreferences) return; this.savingPreferences = true; this.crm.saveNotificationPreferences(this.orgId, this.preferences).subscribe({ next: value => { this.preferences = value; this.savingPreferences = false; this.flash('Notification preferences saved'); }, error: error => { this.error = error?.error?.message || 'Unable to save notification preferences.'; this.savingPreferences = false; } }); }
  private flash(value: string): void { this.toast = value; setTimeout(() => this.toast = '', 2000); }
}
