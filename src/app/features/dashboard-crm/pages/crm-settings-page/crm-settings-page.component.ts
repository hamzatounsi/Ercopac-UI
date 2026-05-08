// Path: src/app/features/dashboard-crm/pages/crm-settings-page/crm-settings-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CrmService } from '../../services/crm.service';
import { CrmPipelineStage, emptyStage } from '../../models/crm-pipeline-stage.model';

type SettingsTab = 'profile' | 'organisation' | 'pipeline' | 'supply' | 'users' | 'customers' | 'notifications';

interface SupplyCategory { id: number; name: string; }
interface TeamMember {
  id: number; name: string; initials: string; color: string;
  role: string; email: string; region: string; active: boolean;
  opps: number; leads: number;
}

@Component({
  selector: 'app-crm-settings-page',
  templateUrl: './crm-settings-page.component.html',
  styleUrls: ['./crm-settings-page.component.scss']
})
export class CrmSettingsPageComponent implements OnInit {

  orgId = this.crmService.getOrgIdFromToken();
  activeTab: SettingsTab = 'profile';
tabs: { key: SettingsTab; label: string }[] = [
  { key: 'profile',       label: 'My profile' },
  { key: 'organisation',  label: 'Organisation' },
  { key: 'pipeline',      label: 'Pipeline stages' },
  { key: 'supply',        label: 'Supply categories' },
  { key: 'users',         label: 'Users & permissions' },
  { key: 'customers',     label: 'Customer list' },
  { key: 'notifications', label: 'Notifications' },
];
  // ── My Profile ────────────────────────────────────────────
  profile = {
    firstName: 'Anis', lastName: 'Messaoud',
    email: 'anis@ercopac.it', phone: '',
    jobTitle: 'Sales Manager', department: 'Sales',
    language: 'English', timezone: 'Europe/Rome (UTC+1)',
    color: 'Blue'
  };

  passwords = { current: '', newPass: '', confirm: '' };

  // ── Organisation ──────────────────────────────────────────
  org = {
    name: 'Ercopac',
    defaultPipeline: 'MTO',
    currency: 'EUR (€)',
    plan: 'Professional',
    fiscalYear: 'January'
  };

  // ── Pipeline stages ───────────────────────────────────────
  stages: CrmPipelineStage[] = [];
  stageForm: CrmPipelineStage = emptyStage();
  showStageForm = false;
  editingStageId: number | null = null;

  // ── Supply categories ─────────────────────────────────────
  supplyCategories: SupplyCategory[] = [
    { id: 1, name: 'AS/RS' },
    { id: 2, name: 'Conveyor' },
    { id: 3, name: 'Shuttle system' },
    { id: 4, name: 'Pallet racking' },
    { id: 5, name: 'Drive-in racking' },
    { id: 6, name: 'Mezzanine' },
    { id: 7, name: 'Sorter' },
    { id: 8, name: 'Cold storage' },
    { id: 9, name: 'ETO custom' },
    { id: 10, name: 'Other' },
  ];
  newCategoryName = '';

  // ── Team members ──────────────────────────────────────────
  teamMembers: TeamMember[] = [
    { id: 1, name: 'Anis Messaoud',   initials: 'AM',  color: '#3b82f6', role: 'Admin',    email: 'anis@ercopac.it',      region: 'Middle East & North Africa',    active: true, opps: 1, leads: 7 },
    { id: 2, name: 'Anita Krizmanic', initials: 'AK',  color: '#22c55e', role: 'Sales rep', email: 'a.krizmanic@ercopac.it', region: 'Eastern Europe & Balkans',    active: true, opps: 1, leads: 2 },
    { id: 3, name: 'Manuel Grassi',   initials: 'MG',  color: '#f59e0b', role: 'Sales rep', email: 'm.grassi@ercopac.it',   region: 'Italy & Southern Europe',     active: true, opps: 1, leads: 2 },
    { id: 4, name: 'Mirco Santi',     initials: 'MS',  color: '#f97316', role: 'Sales rep', email: 'm.santi@ercopac.it',    region: 'Germany & Central Europe',    active: true, opps: 1, leads: 1 },
    { id: 5, name: 'Andrea Manfredi', initials: 'AM2', color: '#ef4444', role: 'Sales rep', email: 'a.manfredi@ercopac.it', region: 'France & Iberia',             active: true, opps: 0, leads: 0 },
    { id: 6, name: 'Regis Richard',   initials: 'RR',  color: '#8b5cf6', role: 'Sales rep', email: 'r.richard@ercopac.it',  region: 'West Africa & Francophone Africa', active: true, opps: 0, leads: 0 },
    { id: 7, name: 'David Ferell',    initials: 'DF',  color: '#06b6d4', role: 'Sales rep', email: 'd.ferell@ercopac.it',   region: 'Americas & Asia Pacific',     active: true, opps: 0, leads: 0 },
  ];

  // ── Customer list ─────────────────────────────────────────
  customerSearch = '';
  customers = [
    { id: 'CMP-001', name: 'Memf',                     industry: 'Manufacturing',       country: 'Saudi Arabia', city: 'Riyadh',    website: 'www.memf.com.sa',          contacts: 1, opps: 0 },
    { id: 'CMP-002', name: 'Qetaf Electrics',           industry: 'Electrical',          country: 'Saudi Arabia', city: 'Jeddah',    website: '—',                        contacts: 1, opps: 0 },
    { id: 'CMP-003', name: 'TDM Consultants',           industry: 'Consulting',          country: 'Saudi Arabia', city: 'Riyadh',    website: 'www.tdmconsults.com',      contacts: 2, opps: 0 },
    { id: 'CMP-004', name: 'Future Pipe Industries',    industry: 'Pipe Manufacturing',  country: 'UAE',          city: 'Dubai',     website: 'www.futurepipe.com',       contacts: 1, opps: 1 },
    { id: 'CMP-005', name: 'El Ghurair',                industry: 'Conglomerate',        country: 'UAE',          city: 'Dubai',     website: 'www.alghurair.com',        contacts: 1, opps: 0 },
    { id: 'CMP-006', name: 'AJ Steel',                  industry: 'Steel',               country: 'UAE',          city: 'Sharjah',   website: '—',                        contacts: 1, opps: 0 },
    { id: 'CMP-007', name: 'IQ Robotics',               industry: 'Robotics & Automation',country: 'UAE',         city: 'Abu Dhabi', website: 'www.iqrobotics.com',       contacts: 1, opps: 0 },
    { id: 'CMP-008', name: 'Span Group / SNS',          industry: 'Distribution',        country: 'UAE',          city: 'Dubai',     website: 'www.span-group.com',       contacts: 1, opps: 0 },
    { id: 'CMP-009', name: 'Bait Al Tatawor',           industry: 'Construction',        country: 'Saudi Arabia', city: 'Dammam',    website: '—',                        contacts: 1, opps: 0 },
    { id: 'CMP-010', name: 'Al Yamamah',                industry: 'Steel',               country: 'Saudi Arabia', city: 'Riyadh',    website: 'www.yamsteel.com',         contacts: 1, opps: 0 },
    { id: 'CMP-011', name: 'Al Nafie',                  industry: 'Industrial',          country: 'Saudi Arabia', city: 'Riyadh',    website: 'www.alnaife-indust.com',   contacts: 1, opps: 1 },
    { id: 'CMP-012', name: 'The Food Industries RANDA', industry: 'Manufacturing',       country: 'Tunisia',      city: 'Tunis',     website: '—',                        contacts: 0, opps: 1 },
    { id: 'CMP-013', name: 'Technometal Egypt',         industry: 'Manufacturing',       country: 'Egypt',        city: 'Cairo',     website: '—',                        contacts: 0, opps: 1 },
  ];

  // ── Notifications ─────────────────────────────────────────
  notifications = {
    emailNotifications:   true,
    stageChangeAlerts:    true,
    closingDateReminders: true,
    leadAssignmentAlerts: false,
    weeklyDigest:         true,
  };

  constructor(private crmService: CrmService) {}

  ngOnInit(): void { this.loadStages(); }

  setTab(tab: SettingsTab): void { this.activeTab = tab; }

  // ── Pipeline stage methods ────────────────────────────────
  loadStages(): void {
    this.crmService.getStages(this.orgId).subscribe({
      next: s => this.stages = s,
      error: err => console.error(err)
    });
  }

  openAddStage(): void {
    this.stageForm = emptyStage();
    this.stageForm.displayOrder = this.stages.length;
    this.editingStageId = null;
    this.showStageForm = true;
  }

  saveStage(): void {
    if (!this.stageForm.name?.trim()) return;
    const obs = this.editingStageId
      ? this.crmService.updateStage(this.orgId, this.editingStageId, this.stageForm)
      : this.crmService.createStage(this.orgId, this.stageForm);
    obs.subscribe({ next: () => { this.showStageForm = false; this.loadStages(); } });
  }

  deleteStage(s: CrmPipelineStage): void {
    if (!confirm(`Delete stage "${s.name}"?`)) return;
    this.crmService.deleteStage(this.orgId, s.id!).subscribe({ next: () => this.loadStages() });
  }

  // ── Supply category methods ───────────────────────────────
  addCategory(): void {
    if (!this.newCategoryName.trim()) return;
    const newId = Math.max(...this.supplyCategories.map(c => c.id)) + 1;
    this.supplyCategories.push({ id: newId, name: this.newCategoryName.trim() });
    this.newCategoryName = '';
  }

  removeCategory(id: number): void {
    this.supplyCategories = this.supplyCategories.filter(c => c.id !== id);
  }

  // ── Customer search ───────────────────────────────────────
  get filteredCustomers() {
    const t = this.customerSearch.toLowerCase();
    if (!t) return this.customers;
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(t) ||
      c.industry.toLowerCase().includes(t) ||
      c.country.toLowerCase().includes(t)
    );
  }

  // ── Save all ──────────────────────────────────────────────
  saveAll(): void {
    alert('Changes saved (UI only — connect to API when ready)');
  }

  // ── Profile initials ──────────────────────────────────────
  get profileInitials(): string {
    return (this.profile.firstName[0] + this.profile.lastName[0]).toUpperCase();
  }
}