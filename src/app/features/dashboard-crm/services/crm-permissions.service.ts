import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CrmPermissionsService {
  constructor(private auth: AuthService) {}
  get canWriteCrm(): boolean {
    const role = this.auth.getCurrentRole();
    return ['SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'PLATFORM_OWNER'].includes(role);
  }
  get canAccessManagerView(): boolean { return this.auth.getCurrentRole() === 'SALES_MANAGER_LEAD'; }
  get hasOwnOpportunityScope(): boolean { return ['SALES_MANAGER', 'SYSTEM_ENGINEER'].includes(this.auth.getCurrentRole()); }
  get currentUserId(): number | null { return this.auth.getCurrentUserId(); }
  get isCrmReadOnly(): boolean { return !this.canWriteCrm; }
}
