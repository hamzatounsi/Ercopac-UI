import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead } from '../../models/crm-lead.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmPipelineStage } from '../../models/crm-pipeline-stage.model';
import { CrmOpportunityAttachment, CrmOpportunityHistory, CrmOpportunityNote, CrmOpportunityStageHistory, CrmSupplyCategory, CrmUser } from '../../models/crm-detail.model';
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

  constructor(private crm: CrmService, private route: ActivatedRoute, private router: Router, private host: ElementRef, public permissions: CrmPermissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    forkJoin({ opportunity: this.crm.getOpportunity(this.orgId, this.id), stages: this.crm.getStages(this.orgId), accounts: this.crm.getAccounts(this.orgId), users: this.crm.getCrmUsers(this.orgId), teamUsers: this.crm.getOpportunityTeamUsers(this.orgId), categories: this.crm.getOrganisationCategories(this.orgId), notes: this.crm.getNotes(this.orgId, this.id), attachments: this.crm.getAttachments(this.orgId, this.id), history: this.crm.getHistory(this.orgId, this.id), stageHistory: this.crm.getStageHistory(this.orgId, this.id) }).subscribe({
      next: r => { this.opportunity = r.opportunity; this.form = { ...r.opportunity, teamMembers: [...(r.opportunity.teamMembers || [])] }; this.stages = r.stages; this.accounts = r.accounts; this.users = r.users; this.teamUsers = r.teamUsers; this.categories = r.categories; this.notes = r.notes; this.attachments = r.attachments; this.history = r.history; this.stageHistory = r.stageHistory; this.loadContacts(); this.loading = false; },
      error: e => { this.error = e?.error?.message || 'Opportunity not found.'; this.loading = false; }
    });
  }
  loadContacts(clear = false): void { if (!this.form?.accountId) { this.contacts = []; return; } if (clear) this.form.leadId = null; this.crm.getLeads(this.orgId, undefined, undefined, this.form.accountId).subscribe(v => this.contacts = v); }
  get contact(): CrmLead | undefined { return this.contacts.find(v => v.id === this.form?.leadId); }
  save(): void { if (!this.form || !this.permissions.canWriteCrm) return; this.saving = true; this.crm.updateOpportunity(this.orgId, this.id, this.form).subscribe({ next: () => { this.saving = false; this.flash('Opportunity saved'); this.load(); }, error: e => { this.error = e?.error?.message || 'Unable to save.'; this.saving = false; } }); }
  changeStage(stage: CrmPipelineStage): void { if (!this.permissions.canWriteCrm || stage.id === this.opportunity?.stageId) return; this.crm.changeStage(this.orgId, this.id, stage.id!).subscribe({ next: () => { this.flash('Stage updated'); this.load(); }, error: e => this.error = e?.error?.message || 'Unable to change stage.' }); }
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
  money(value: number | null | undefined, currency = 'EUR'): string { return value ? new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) : '—'; }
  private cents(value: number | null | undefined): number { return Math.round((Number(value) || 0) * 100); }
  private fromCents(value: number): number { return value / 100; }
  get totalValue(): number { return this.fromCents(this.cents(this.form?.materialValue) + this.cents(this.form?.servicesValue)); }
  get totalSalesSplit(): number { return this.fromCents(this.cents(this.form?.ercopacMaterialValue) + this.cents(this.form?.thirdPartyMaterialValue)); }
  get totalResaleSplit(): number { return this.fromCents(this.cents(this.form?.ercopacResaleValue) + this.cents(this.form?.resaleValue)); }
  get account(): CrmAccount | undefined { return this.accounts.find(v => v.id === this.form?.accountId); }
  cycleDuration(): string { if (!this.opportunity?.createdAt) return '—'; const start = new Date(this.opportunity.createdAt); if (Number.isNaN(start.getTime())) return '—'; const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000)); return days === 1 ? '1 day' : days + ' days'; }
  stageClass(stage: CrmPipelineStage): string { const current = this.stages.findIndex(v => v.id === this.opportunity?.stageId), index = this.stages.indexOf(stage); return index < current ? 'done' : index === current ? (stage.lost ? 'lost' : 'current') : ''; }
  initials(value: string | null | undefined): string { return (value || '?').split(/\s+/).slice(0, 2).map(item => item[0]).join('').toUpperCase(); }
  fileSize(value: number): string { return value > 1048576 ? (value / 1048576).toFixed(1) + ' MB' : Math.ceil(value / 1024) + ' KB'; }
  private flash(value: string): void { this.toast = value; setTimeout(() => this.toast = '', 2200); }
}
