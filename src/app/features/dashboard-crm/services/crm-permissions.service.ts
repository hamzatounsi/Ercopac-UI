import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CrmPermissionsService {
  constructor(private auth: AuthService) {}
  get canWriteCrm(): boolean {
    const role = this.auth.getCurrentRole();
    if (role === 'SYSTEM_ENGINEER') return false;
    return ['SALES_MANAGER_LEAD', 'SALES_MANAGER', 'PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'PLATFORM_OWNER'].includes(role);
  }
  get canAccessManagerView(): boolean { return this.auth.getCurrentRole() === 'SALES_MANAGER_LEAD'; }
  get isCrmReadOnly(): boolean { return !this.canWriteCrm; }
}
