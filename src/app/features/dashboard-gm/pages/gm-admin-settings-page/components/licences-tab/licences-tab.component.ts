import { Component, OnInit } from '@angular/core';
import { GmAdminService } from 'src/app/features/dashboard-gm/services/gm-admin.service';
import { GmResourceService } from 'src/app/features/dashboard-gm/services/gm-resource.service';
import { ResourceListItem } from 'src/app/features/dashboard-gm/models/resource-list-item.model';

interface LicenceRole {
  key: string;
  label: string;
  backendValue: string;
  icon: string;
  cssClass: string;
  quota: number;
  description: string;
}

@Component({
  selector: 'app-licences-tab',
  templateUrl: './licences-tab.component.html',
  styleUrls: ['./licences-tab.component.scss']
})
export class LicencesTabComponent implements OnInit {

  resources: ResourceListItem[] = [];
  licences: any[] = [];

  search = '';
  selectedRole = '';

  loading = false;
  errorMessage = '';

  roles: LicenceRole[] = [
    {
      key: 'ADMIN',
      label: 'Admin',
      backendValue: 'ADMIN',
      icon: '🛡️',
      cssClass: 'lic-admin',
      quota: 2,
      description: 'Full access to all pages, settings and admin panel.'
    },
    {
      key: 'PM',
      label: 'PM',
      backendValue: 'PM',
      icon: '📊',
      cssClass: 'lic-pm',
      quota: 20,
      description: 'Manages own projects end-to-end. Edits Gantt, Finance, Forecast and Risk.'
    },
    {
      key: 'MANAGER',
      label: 'Manager',
      backendValue: 'MANAGER',
      icon: '📋',
      cssClass: 'lic-manager',
      quota: 10,
      description: 'Portfolio view. Edits Finance and Forecast. Cannot edit Gantt tasks.'
    },
    {
      key: 'DEPT_MANAGER',
      label: 'Dept. Mgr',
      backendValue: 'DEPT_MANAGER',
      icon: '🏢',
      cssClass: 'lic-dept',
      quota: 15,
      description: 'Manages department resources and forecast. My Department page only.'
    },
    {
      key: 'READ_ONLY',
      label: 'Read Only',
      backendValue: 'READ_ONLY',
      icon: '👁️',
      cssClass: 'lic-readonly',
      quota: 50,
      description: 'View-only access to all pages. Cannot save or edit anything.'
    }
  ];

  constructor(
    private adminService: GmAdminService,
    private resourceService: GmResourceService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.resourceService.getResources({ size: 500, active: true }).subscribe({
      next: resourcesPage => {
        this.resources = resourcesPage.content || [];

        this.adminService.getLicences().subscribe({
          next: licences => {
            this.licences = licences || [];
            this.loading = false;
          },
          error: () => {
            this.errorMessage = 'Failed to load licences.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load resources.';
        this.loading = false;
      }
    });
  }

  get visibleRoles(): LicenceRole[] {
    if (!this.selectedRole) {
      return this.roles;
    }

    return this.roles.filter(r => r.key === this.selectedRole);
  }

  assignedForRole(roleKey: string): any[] {
    let rows = this.licences.filter(l => l.licenceType === roleKey);

    const q = this.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(l =>
        (l.fullName || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.departmentCode || '').toLowerCase().includes(q) ||
        (l.resourceType || '').toLowerCase().includes(q)
      );
    }

    return rows;
  }

  availableResources(): ResourceListItem[] {
    const assignedIds = new Set(this.licences.map(l => l.userId));

    return this.resources.filter(r => {
      if (!r.id || assignedIds.has(r.id)) {
        return false;
      }

      return true;
    });
  }

  assignLicence(role: LicenceRole, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const userId = Number(select.value);

    if (!userId) {
      return;
    }

    this.adminService.assignLicence({
      userId,
      licenceType: role.backendValue
    }).subscribe({
      next: () => {
        select.value = '';
        this.load();
      },
      error: () => {
        this.errorMessage = 'Failed to assign licence.';
      }
    });
  }

  removeLicence(userId: number): void {
    this.adminService.removeLicence(userId).subscribe({
      next: () => this.load(),
      error: () => {
        this.errorMessage = 'Failed to remove licence.';
      }
    });
  }

  usedCount(roleKey: string): number {
    return this.licences.filter(l => l.licenceType === roleKey).length;
  }

  quotaPercent(role: LicenceRole): number {
    const pct = (this.usedCount(role.key) / role.quota) * 100;
    return Math.min(100, Math.round(pct));
  }

  quotaClass(role: LicenceRole): string {
    const pct = this.usedCount(role.key) / role.quota;

    if (pct > 0.85) {
      return 'over';
    }

    if (pct > 0.65) {
      return 'warn';
    }

    return '';
  }

  get totalAssigned(): number {
    return this.licences.length;
  }
}