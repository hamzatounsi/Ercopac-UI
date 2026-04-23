import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';
import { GmResourceManagementPageComponent } from '../dashboard-gm/pages/gm-resource-management-page/gm-resource-management-page.component';

import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { RoleGuard } from 'src/app/core/auth/role.guard';

const projectumAccessRoles = [
  'PLATFORM_OWNER',
  'PLATFORM_ADMIN',
  'ROLE_PLATFORM_OWNER',
  'ROLE_PLATFORM_ADMIN'
];

const routes: Routes = [
  {
    path: '',
    component: OwnerDashboardPageComponent
  },
  {
    path: 'resources',
    component: GmResourceManagementPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: projectumAccessRoles }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardOwnerRoutingModule {}