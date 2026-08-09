import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { GmAdminService } from 'src/app/features/dashboard-gm/services/gm-admin.service';

interface LicenceRole {
  key: string;
  label: string;
  icon: string;
  cssClass: string;
  description: string;
}

interface LicenceUsage {
  role: string;
  label: string;
  limit: number;
  used: number;
  available: number;
  unlimited: boolean;
}

interface LicenceCandidate {
  userId: number;
  fullName: string;
  email: string;
  departmentCode?: string | null;
  resourceType?: string | null;
  role: string;
}

@Component({
  selector: 'app-licences-tab',
  templateUrl: './licences-tab.component.html',
  styleUrls: ['./licences-tab.component.scss']
})
export class LicencesTabComponent implements OnInit {
  candidates: LicenceCandidate[] = [];
  licences: any[] = [];
  usage: LicenceUsage[] = [];

  search = '';
  selectedRole = '';
  loading = false;
  errorMessage = '';

  readonly roles: LicenceRole[] = [
    { key: 'ORG_ADMIN', label: 'Organisation Admin', icon: '🛡️', cssClass: 'lic-admin', description: 'Organisation administration and configuration.' },
    { key: 'PROJECT_MANAGER', label: 'Project Manager', icon: '📊', cssClass: 'lic-pm', description: 'Operational project-management role.' },
    { key: 'DEPARTMENT_MANAGER', label: 'Department Manager', icon: '🏢', cssClass: 'lic-dept', description: 'Department management role.' },
    { key: 'EMPLOYEE', label: 'Employee', icon: '👤', cssClass: 'lic-employee', description: 'Internal operational resource.' },
    { key: 'SALES_MANAGER', label: 'Sales Manager', icon: '🤝', cssClass: 'lic-sales', description: 'Internal sales resource with ticketing access.' },
    { key: 'CLIENT', label: 'Client', icon: '🎫', cssClass: 'lic-client', description: 'Organisation-scoped external ticketing user.' }
  ];

  constructor(private adminService: GmAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      licences: this.adminService.getLicences(),
      usage: this.adminService.getLicenceUsage(),
      candidates: this.adminService.getLicenceCandidates()
    }).subscribe({
      next: result => {
        this.licences = result.licences || [];
        this.usage = result.usage || [];
        this.candidates = result.candidates || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load licence allocation.';
        this.loading = false;
      }
    });
  }

  get visibleRoles(): LicenceRole[] {
    return this.selectedRole ? this.roles.filter(role => role.key === this.selectedRole) : this.roles;
  }

  usageFor(roleKey: string): LicenceUsage {
    return this.usage.find(item => item.role === roleKey)
      || { role: roleKey, label: roleKey, limit: 0, used: 0, available: 0, unlimited: false };
  }

  assignedForRole(roleKey: string): any[] {
    let rows = this.licences.filter(licence => licence.licenceType === roleKey);
    const query = this.search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(item => [item.fullName, item.email, item.departmentCode, item.resourceType]
        .some(value => (value || '').toLowerCase().includes(query)));
    }
    return rows;
  }

  availableCandidates(): LicenceCandidate[] {
    return this.candidates;
  }

  assignLicence(role: LicenceRole, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const userId = Number(select.value);
    if (!userId) return;

    this.adminService.assignLicence({ userId, licenceType: role.key }).subscribe({
      next: () => { select.value = ''; this.load(); },
      error: error => { this.errorMessage = error?.error?.message || 'Failed to assign licence.'; }
    });
  }

  removeLicence(userId: number): void {
    this.adminService.removeLicence(userId).subscribe({
      next: () => this.load(),
      error: error => { this.errorMessage = error?.error?.message || 'Failed to remove licence.'; }
    });
  }

  quotaPercent(role: LicenceRole): number {
    const usage = this.usageFor(role.key);
    return usage.unlimited || usage.limit === 0 ? 0 : Math.min(100, Math.round((usage.used / usage.limit) * 100));
  }

  quotaClass(role: LicenceRole): string {
    const percent = this.quotaPercent(role);
    return percent > 85 ? 'over' : percent > 65 ? 'warn' : '';
  }

  get totalAssigned(): number {
    return this.usage.reduce((total, item) => total + item.used, 0);
  }
}
