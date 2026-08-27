import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { OrganisationAdminOverview } from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';

@Component({
  selector: 'app-org-admin-overview',
  templateUrl: './org-admin-overview.component.html',
  styleUrls: ['./org-admin-overview.component.scss']
})
export class OrgAdminOverviewComponent implements OnInit {
  overview: OrganisationAdminOverview | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';

  constructor(private readonly adminService: OrgAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(refresh = false): void {
    this.errorMessage = '';
    this.refreshing = refresh;
    if (!refresh) this.loading = true;
    this.adminService.getOverview().pipe(
      finalize(() => {
        this.loading = false;
        this.refreshing = false;
      })
    ).subscribe({
      next: overview => this.overview = overview,
      error: error => this.errorMessage = adminErrorMessage(error, 'Could not load the administration overview.')
    });
  }

  roleCapacity(role: string): number | null {
    if (!this.overview) return null;
    const org = this.overview.organisation;
    switch (role) {
      case 'ORG_ADMIN': return org.orgAdminLicenceLimit;
      case 'PROJECT_MANAGER': return org.projectManagerLicenceLimit;
      case 'DEPARTMENT_MANAGER': return org.departmentManagerLicenceLimit;
      case 'EMPLOYEE': return org.employeeLicenceLimit;
      case 'SALES_MANAGER_LEAD':
      case 'SALES_MANAGER':
      case 'SYSTEM_ENGINEER': return org.salesManagerLicenceLimit;
      case 'CLIENT': return org.clientLicenceLimit;
      default: return null;
    }
  }

  capacityPercent(active: number, capacity: number | null): number {
    return capacity == null || capacity <= 0 ? 0 : Math.min(100, Math.round(active * 100 / capacity));
  }
}
