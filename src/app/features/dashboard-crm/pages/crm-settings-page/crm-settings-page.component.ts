import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CrmPipelineStage, emptyStage } from '../../models/crm-pipeline-stage.model';
import { CrmIndustry, CrmNotificationPreference } from '../../models/crm-detail.model';
import { CrmEquipmentType, CrmReportSchedule } from '../../models/crm-equipment.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';

@Component({ selector: 'app-crm-settings-page', templateUrl: './crm-settings-page.component.html', styleUrls: ['./crm-settings-page.component.scss'] })
export class CrmSettingsPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); active: 'pipeline' | 'industry' | 'equipment' | 'schedule' | 'notifications' = 'pipeline'; stages: CrmPipelineStage[] = []; industries: CrmIndustry[] = []; equipmentTypes: CrmEquipmentType[]=[]; schedules: CrmReportSchedule[]=[]; newEquipment: CrmEquipmentType={id:null,code:'',name:'',active:true}; newStage = emptyStage(); newIndustry: CrmIndustry = { id: null, name: '', active: true };
  preferences: CrmNotificationPreference = { emailNotifications: true, stageChangeAlerts: true, closingDateReminders: false };
  addingStage = false; addingIndustry = false; addingEquipment=false; loading = true; savingPreferences = false; error = ''; toast = '';
  readonly reportOptions = [
    { id: 'WORLD_MAP', label: 'World map' }, { id: 'BY_COUNTRY', label: 'By country' },
    { id: 'TIMELINE', label: 'Timeline' }, { id: 'VALUE_SPLIT', label: 'Material vs Services' },
    { id: 'ERCOPAC_TF', label: 'Ercopac / TF split' }, { id: 'ERCOPAC_RESALE', label: 'Ercopac / Resale split' },
    { id: 'MONTHLY_OVERVIEW', label: 'Monthly overview' }, { id: 'CS_PROJECTS', label: 'CS projects overview' },
    { id: 'BP_PROJECTS', label: 'BP projects overview' }, { id: 'EXPECTED_REVENUE', label: 'Expected revenue by month' },
    { id: 'EQUIPMENT_OVERVIEW', label: 'Equipment overview' }, { id: 'EQUIPMENT_SHIPMENT_ON_TIME', label: 'Equipment shipment on time' }
  ];
  constructor(private crm: CrmService, public permissions: CrmPermissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void { forkJoin({ stages: this.crm.getStages(this.orgId), industries: this.crm.getIndustries(this.orgId, true), equipment:this.crm.getEquipmentTypes(this.orgId,true), schedules:this.crm.getReportSchedules(this.orgId), preferences: this.crm.getNotificationPreferences(this.orgId) }).subscribe({ next: result => { this.stages = result.stages; this.industries = result.industries; this.equipmentTypes=result.equipment;this.schedules=result.schedules; this.preferences = result.preferences; this.loading = false; }, error: error => { this.error = error?.error?.message || 'Unable to load CRM settings.'; this.loading = false; } }); }
  saveEquipment(item:CrmEquipmentType):void {if(!item.id)return;this.crm.updateEquipmentType(this.orgId,item.id,item).subscribe({next:v=>{Object.assign(item,v);this.flash('Equipment saved');},error:e=>this.error=e?.error?.message||'Unable to save equipment.'});}
  addEquipment():void {if(!this.newEquipment.code.trim()||!this.newEquipment.name.trim())return;this.crm.createEquipmentType(this.orgId,this.newEquipment).subscribe({next:v=>{this.equipmentTypes=[...this.equipmentTypes,v];this.newEquipment={id:null,code:'',name:'',active:true};this.addingEquipment=false;this.flash('Equipment added');},error:e=>this.error=e?.error?.message||'Unable to add equipment.'});}
  deleteEquipment(item:CrmEquipmentType):void {if(!item.id||!confirm('Deactivate this equipment type?'))return;this.crm.deleteEquipmentType(this.orgId,item.id).subscribe({next:()=>{item.active=false;this.flash('Equipment deactivated');},error:e=>this.error=e?.error?.message||'Unable to deactivate equipment.'});}
  get activeEquipmentTypes(): CrmEquipmentType[] { return this.equipmentTypes.filter(item => item.active); }
  get activeIndustries(): CrmIndustry[] { return this.industries.filter(item => item.active); }
  startEquipment(): void { this.newEquipment={id:null,code:'',name:'',active:true}; this.addingEquipment=true; }
  startIndustry(): void { this.newIndustry={id:null,name:'',active:true}; this.addingIndustry=true; }
  startStage(): void { this.newStage=emptyStage(); this.newStage.probability=50; this.addingStage=true; }
  addSchedule():void {const dto:CrmReportSchedule={id:null,reportType:'MONTHLY_OVERVIEW',typeFilter:'ALL',recipients:'',frequency:'MONTHLY',active:true,lastSentAt:null,nextRunAt:null};this.schedules=[...this.schedules,dto];}
  saveSchedule(item:CrmReportSchedule):void {if(!this.permissions.canWriteCrm)return;if(!item.recipients.trim()){if(item.id)this.error='Recipients are required for every active report schedule.';return;}this.error='';if(item.id)this.crm.updateReportSchedule(this.orgId,item.id,item).subscribe({next:v=>{Object.assign(item,v);this.flash('Schedule saved');},error:e=>this.error=e?.error?.message||'Unable to save schedule.'});else this.crm.createReportSchedule(this.orgId,item).subscribe({next:v=>{this.schedules=this.schedules.map(x=>x===item?v:x);this.flash('Schedule saved');},error:e=>this.error=e?.error?.message||'Unable to save schedule.'});}
  deleteSchedule(item:CrmReportSchedule):void {if(!item.id){this.schedules=this.schedules.filter(x=>x!==item);return;}if(!confirm('Remove this schedule?'))return;this.crm.deleteReportSchedule(this.orgId,item.id).subscribe({next:()=>this.schedules=this.schedules.filter(x=>x.id!==item.id),error:e=>this.error=e?.error?.message||'Unable to remove schedule.'});}
  saveStage(stage: CrmPipelineStage): void { if (!stage.id) return; this.crm.updateStage(this.orgId, stage.id, stage).subscribe({ next: () => this.flash('Pipeline stage saved'), error: error => this.error = error?.error?.message || 'Unable to save stage.' }); }
  moveStage(index: number, direction: -1 | 1): void { const target=index+direction;if(target<0||target>=this.stages.length)return;const first=this.stages[index],second=this.stages[target];[first.displayOrder,second.displayOrder]=[second.displayOrder,first.displayOrder];this.stages[index]=second;this.stages[target]=first;if(!first.id||!second.id)return;forkJoin([this.crm.updateStage(this.orgId,first.id,first),this.crm.updateStage(this.orgId,second.id,second)]).subscribe({next:()=>this.flash('Stage order saved'),error:error=>{this.error=error?.error?.message||'Unable to reorder stages.';this.load();}}); }
  addStage(): void { if (!this.newStage.name.trim()) return; this.newStage.displayOrder = this.stages.length; this.crm.createStage(this.orgId, this.newStage).subscribe({ next: stage => { this.stages = [...this.stages, stage]; this.newStage = emptyStage(); this.addingStage = false; this.flash('Pipeline stage added'); }, error: error => this.error = error?.error?.message || 'Unable to add stage.' }); }
  deleteStage(stage: CrmPipelineStage): void { if (!stage.id || !confirm('Delete this stage?')) return; this.crm.deleteStage(this.orgId, stage.id).subscribe({ next: () => this.stages = this.stages.filter(value => value.id !== stage.id), error: error => this.error = error?.error?.message || 'Unable to delete stage.' }); }
  saveIndustry(industry: CrmIndustry): void { if (!industry.id) return; this.crm.updateIndustry(this.orgId, industry.id, industry).subscribe({ next: value => { Object.assign(industry, value); this.flash('Industry saved'); }, error: error => this.error = error?.error?.message || 'Unable to save industry.' }); }
  addIndustry(): void { if (!this.newIndustry.name.trim()) return; this.crm.createIndustry(this.orgId, this.newIndustry).subscribe({ next: value => { this.industries = [...this.industries, value].sort((a, b) => a.name.localeCompare(b.name)); this.newIndustry = { id: null, name: '', active: true }; this.addingIndustry = false; this.flash('Industry added'); }, error: error => this.error = error?.error?.message || 'Unable to add industry.' }); }
  deleteIndustry(industry: CrmIndustry): void { if (!industry.id || !confirm('Delete this industry?')) return; this.crm.deleteIndustry(this.orgId, industry.id).subscribe({ next: () => { this.industries = this.industries.filter(value => value.id !== industry.id); this.flash('Industry deleted'); }, error: error => this.error = error?.error?.message || 'Unable to delete industry.' }); }
  savePreferences(): void { if (this.savingPreferences) return; this.savingPreferences = true; this.crm.saveNotificationPreferences(this.orgId, this.preferences).subscribe({ next: value => { this.preferences = value; this.savingPreferences = false; this.flash('Notification preferences saved'); }, error: error => { this.error = error?.error?.message || 'Unable to save notification preferences.'; this.savingPreferences = false; } }); }
  private flash(value: string): void { this.toast = value; setTimeout(() => this.toast = '', 2000); }
}
