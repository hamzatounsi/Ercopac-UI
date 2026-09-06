import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead } from '../../models/crm-lead.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmOpportunityAttachment, CrmOpportunityHistory, CrmOpportunityNote, CrmOpportunityStageHistory, CrmSupplyCategory, CrmUser } from '../../models/crm-detail.model';
import { CrmEquipmentType, CrmOpportunityEquipment } from '../../models/crm-equipment.model';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmService } from '../../services/crm.service';

@Component({ selector: 'app-crm-opportunity-detail-page', templateUrl: './crm-opportunity-detail-page.component.html', styleUrls: ['./crm-opportunity-detail-page.component.scss'] })
export class CrmOpportunityDetailPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken(); id = Number(this.route.snapshot.paramMap.get('id'));
  opportunity?: CrmOpportunity; form?: CrmOpportunity; stages: CrmPipelineStage[] = []; accounts: CrmAccount[] = [];
  contacts: CrmLead[] = []; users: CrmUser[] = []; teamUsers: CrmUser[] = []; categories: CrmSupplyCategory[] = [];
  notes: CrmOpportunityNote[] = []; attachments: CrmOpportunityAttachment[] = []; history: CrmOpportunityHistory[] = [];
  stageHistory: CrmOpportunityStageHistory[] = []; loading = true; saving = false; teamSaving = false; showTeamPicker = false;
  teamDraftIds: number[] = []; newNote = ''; error = ''; toast = '';
  equipmentTypes: CrmEquipmentType[]=[]; equipment: CrmOpportunityEquipment[]=[]; newEquipmentTypeId:number|null=null;
  newEquipmentQuantity=1; showEquipmentAdd=false;

  constructor(private crm: CrmService, private route: ActivatedRoute, private router: Router, private host: ElementRef, public permissions: CrmPermissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    forkJoin({ opportunity: this.crm.getOpportunity(this.orgId, this.id), stages: this.crm.getStages(this.orgId), accounts: this.crm.getAccounts(this.orgId), users: this.crm.getCrmUsers(this.orgId), teamUsers: this.crm.getOpportunityTeamUsers(this.orgId), categories: this.crm.getOrganisationCategories(this.orgId), equipmentTypes:this.crm.getEquipmentTypes(this.orgId), equipment:this.crm.getOpportunityEquipment(this.orgId,this.id), notes: this.crm.getNotes(this.orgId, this.id), attachments: this.crm.getAttachments(this.orgId, this.id), history: this.crm.getHistory(this.orgId, this.id), stageHistory: this.crm.getStageHistory(this.orgId, this.id) }).subscribe({
      next: r => { this.opportunity = r.opportunity; this.form = { ...r.opportunity, teamMembers: [...(r.opportunity.teamMembers || [])] }; this.stages = r.stages; this.accounts = r.accounts; this.users = r.users; this.teamUsers = r.teamUsers; this.categories = r.categories; this.equipmentTypes=r.equipmentTypes;this.equipment=r.equipment; this.notes = r.notes; this.attachments = r.attachments; this.history = r.history; this.stageHistory = r.stageHistory; this.loadContacts(); this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Opportunity not found.'; this.loading = false; }
    });
  }
  loadContacts(clear = false): void { if (!this.form?.accountId) { this.contacts = []; return; } if (clear) this.form.leadId = null; this.crm.getLeads(this.orgId, undefined, undefined, this.form.accountId).subscribe(v => this.contacts = v); }
  get contact(): CrmLead | undefined { return this.contacts.find(v => v.id === this.form?.leadId); }
  save(): void {
    if (!this.form || !this.permissions.canWriteCrm) return;
    this.error = this.valueValidationError();
    if (this.error) return;
    this.form.value = this.totalValue;
    this.saving = true;
    this.crm.updateOpportunity(this.orgId, this.id, this.form).subscribe({ next: () => { this.saving = false; this.flash('Opportunity saved'); this.load(); }, error: e => { this.error = e?.error?.message || 'Unable to save.'; this.saving = false; } });
  }
  get availableEquipmentTypes():CrmEquipmentType[]{return this.equipmentTypes.filter(type=>!this.equipment.some(item=>item.equipmentTypeId===type.id));}
  addEquipment():void {if(!this.newEquipmentTypeId||this.newEquipmentQuantity<1)return;const type=this.equipmentTypes.find(x=>x.id===this.newEquipmentTypeId);if(!type)return;this.equipment=[...this.equipment,{equipmentTypeId:type.id!,equipmentCode:type.code,equipmentName:type.name,quantity:this.newEquipmentQuantity}];this.saveEquipment(()=>this.cancelEquipmentAdd());}
  cancelEquipmentAdd():void {this.showEquipmentAdd=false;this.newEquipmentTypeId=null;this.newEquipmentQuantity=1;}
  removeEquipment(index:number):void {const previous=this.equipment;this.equipment=this.equipment.filter((_,i)=>i!==index);this.saveEquipment(undefined,previous);}
  saveEquipment(done?:()=>void,rollback?:CrmOpportunityEquipment[]):void {this.equipment=this.equipment.map(item=>({...item,quantity:Math.max(1,Number(item.quantity)||1)}));this.crm.saveOpportunityEquipment(this.orgId,this.id,this.equipment).subscribe({next:v=>{this.equipment=v;this.flash('Opportunity equipment saved');done?.();},error:e=>{if(rollback)this.equipment=rollback;this.error=e?.error?.message||'Unable to save equipment.';}});}
  changeStage(stage: CrmPipelineStage): void {
    if (!this.permissions.canWriteCrm || stage.id === this.opportunity?.stageId || !this.form || !this.opportunity) return;
    const previous = { stageId: this.opportunity.stageId, stageName: this.opportunity.stageName,
      stageColor: this.opportunity.stageColor, probability: this.form.probability };
    this.form.stageId = stage.id; this.form.probability = stage.probability;
    this.opportunity = { ...this.opportunity, stageId: stage.id, stageName: stage.name,
      stageColor: stage.color, probability: stage.probability };
    this.crm.changeStage(this.orgId, this.id, stage.id!).subscribe({ next: updated => {
      this.opportunity = { ...this.opportunity!, ...updated };
      if (this.form) { this.form.stageId = updated.stageId; this.form.stageName = updated.stageName; this.form.stageColor = updated.stageColor; this.form.probability = updated.probability; }
      this.crm.getStageHistory(this.orgId, this.id).subscribe(history => this.stageHistory = history);
      this.flash('Stage updated');
    }, error: e => {
      this.form!.stageId = previous.stageId; this.form!.probability = previous.probability;
      this.opportunity = { ...this.opportunity!, ...previous };
      this.error = e?.error?.message || 'Unable to change stage.';
    } });
  }
  openTeamPicker(): void { if (!this.permissions.canWriteCrm) return; this.teamDraftIds = (this.opportunity?.teamMembers || []).map(user => user.id); this.showTeamPicker = true; }
  toggleTeamMember(userId: number): void { this.teamDraftIds = this.teamDraftIds.includes(userId) ? this.teamDraftIds.filter(id => id !== userId) : [...this.teamDraftIds, userId]; }
  saveTeam(): void { if (!this.permissions.canWriteCrm || this.teamSaving) return; this.teamSaving = true; this.error = ''; this.crm.updateOpportunityTeam(this.orgId, this.id, this.teamDraftIds).subscribe({ next: opportunity => { this.opportunity = opportunity; if (this.form) this.form.teamMembers = [...opportunity.teamMembers]; this.teamSaving = false; this.showTeamPicker = false; this.flash(`${opportunity.teamMembers.length} team member(s) assigned`); }, error: e => { this.error = e?.error?.message || 'Unable to save the opportunity team.'; this.teamSaving = false; } }); }
  addNote(): void { if (!this.newNote.trim()) return; this.crm.addNote(this.orgId, this.id, this.newNote).subscribe({ next: v => { this.notes = [...this.notes, v]; this.newNote = ''; this.flash('Note posted'); }, error: e => this.error = e?.error?.message || 'Unable to post note.' }); }
  deleteNote(note: CrmOpportunityNote): void { this.crm.deleteNote(this.orgId, this.id, note.id).subscribe(() => this.notes = this.notes.filter(v => v.id !== note.id)); }
  upload(event: Event): void { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; this.crm.uploadAttachment(this.orgId, this.id, file).subscribe({ next: v => { this.attachments = [v, ...this.attachments]; input.value = ''; this.flash('File attached'); }, error: e => this.error = e?.error?.message || 'Unable to upload file.' }); }
  download(attachment: CrmOpportunityAttachment): void { this.crm.downloadAttachment(this.orgId, this.id, attachment.id).subscribe(r => { const url = URL.createObjectURL(r.body!); const link = document.createElement('a'); link.href = url; link.download = attachment.originalFileName; link.click(); URL.revokeObjectURL(url); }); }
  deleteAttachment(attachment: CrmOpportunityAttachment): void { this.crm.deleteAttachment(this.orgId, this.id, attachment.id).subscribe(() => this.attachments = this.attachments.filter(v => v.id !== attachment.id)); }
  remove(): void { if (!confirm('Delete this opportunity?')) return; this.crm.deleteOpportunity(this.orgId, this.id).subscribe({ next: () => this.router.navigate(['/crm/opportunities']), error: e => this.error = e?.error?.message || 'Unable to delete.' }); }
  scroll(id: string): void { this.host.nativeElement.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  money(value: number | null | undefined, currency = 'EUR'): string { return value == null ? '—' : new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  private cents(value: number | null | undefined): number { return Math.round((Number(value) || 0) * 100); }
  private fromCents(value: number): number { return value / 100; }
  get totalValue(): number { return this.fromCents(this.cents(this.form?.materialValue) + this.cents(this.form?.servicesValue)); }
  get totalSalesSplit(): number { return this.fromCents(this.cents(this.form?.ercopacMaterialValue) + this.cents(this.form?.thirdPartyMaterialValue)); }
  get totalResaleSplit(): number { return this.fromCents(this.cents(this.form?.ercopacResaleValue) + this.cents(this.form?.resaleValue)); }
  get discountedValue(): number {
    const discount = Math.max(0, Math.min(100, Number(this.form?.discount) || 0));
    return this.fromCents(Math.round(this.cents(this.totalValue) * (100 - discount) / 100));
  }
  get expectedRevenue(): number {
    return this.discountedValue;
  }
  get hasSalesSplit(): boolean { return this.form?.ercopacMaterialValue != null || this.form?.thirdPartyMaterialValue != null; }
  get hasResaleSplit(): boolean { return this.form?.ercopacResaleValue != null || this.form?.resaleValue != null; }
  get salesSplitValid(): boolean { return !this.hasSalesSplit || this.cents(this.totalSalesSplit) === this.cents(this.totalValue); }
  get resaleSplitValid(): boolean { return !this.hasResaleSplit || this.cents(this.totalResaleSplit) === this.cents(this.totalValue); }
  private valueValidationError(): string {
    if ([this.form?.materialValue, this.form?.servicesValue, this.form?.ercopacMaterialValue,
      this.form?.thirdPartyMaterialValue, this.form?.ercopacResaleValue, this.form?.resaleValue]
      .some(value => value != null && Number(value) < 0)) return 'Opportunity values cannot be negative.';
    const discount = Number(this.form?.discount) || 0;
    if (discount < 0 || discount > 100) return 'Discount must be between 0 and 100%.';
    if (!this.salesSplitValid) return 'Sales split must equal Total Value.';
    if (!this.resaleSplitValid) return 'Resale split must equal Total Value.';
    return '';
  }
  get account(): CrmAccount | undefined { return this.accounts.find(v => v.id === this.form?.accountId); }
  cycleDuration(): string { if (!this.opportunity?.createdAt) return '—'; const start = new Date(this.opportunity.createdAt); if (Number.isNaN(start.getTime())) return '—'; const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)); return days === 1 ? '1 day' : days + ' days'; }
  stageClass(stage: CrmPipelineStage): string { const current = this.stages.findIndex(v => v.id === this.opportunity?.stageId), index = this.stages.indexOf(stage); return index < current ? 'done' : index === current ? (stage.lost ? 'lost' : 'current') : ''; }
  initials(value: string | null | undefined): string { return (value || '?').split(/\s+/).slice(0, 2).map(item => item[0]).join('').toUpperCase(); }
  fileSize(value: number): string { return value > 1048576 ? (value / 1048576).toFixed(1) + ' MB' : Math.ceil(value / 1024) + ' KB'; }
  private flash(value: string): void { this.toast = value; setTimeout(() => this.toast = '', 2200); }
}
