import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CrmPermissionsService {
  constructor(private auth: AuthService) {}
  get canWriteCrm(): boolean {
    return this.auth.hasAnyRole(['SALES_MANAGER_LEAD', 'SALES_MANAGER', 'SYSTEM_ENGINEER', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'PLATFORM_OWNER']);
  }
  get canAccessManagerView(): boolean { return this.auth.hasRole('SALES_MANAGER_LEAD'); }
  get hasOwnOpportunityScope(): boolean {
    return this.auth.hasAnyRole(['SALES_MANAGER', 'SYSTEM_ENGINEER'])
      && !this.auth.hasAnyRole(['SALES_MANAGER_LEAD', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'PLATFORM_OWNER']);
  }
  get currentUserId(): number | null { return this.auth.getCurrentUserId(); }
  get isCrmReadOnly(): boolean { return !this.canWriteCrm; }
}
