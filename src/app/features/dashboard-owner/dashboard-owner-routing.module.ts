import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OwnerLayoutComponent } from './pages/owner-layout/owner-layout.component';
import { OwnerOrganisationsPageComponent } from './pages/owner-organisations-page/owner-organisations-page.component';
import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';
import { GmResourceManagementPageComponent } from '../dashboard-gm/pages/gm-resource-management-page/gm-resource-management-page.component';
import { CreateOrganisationPageComponent } from './pages/create-organisation-page/create-organisation-page.component';

import { AuthGuard } from 'src/app/core/auth/auth.guard';
import { RoleGuard } from 'src/app/core/auth/role.guard';
import { OwnerBillingPageComponent } from './pages/owner-billing-page/owner-billing-page.component';
import { OwnerAnalyticsPageComponent } from './pages/owner-analytics-page/owner-analytics-page.component';
import { OwnerInfrastructurePageComponent } from './pages/owner-infrastructure-page/owner-infrastructure-page.component';
import { OwnerPermissionsPageComponent } from './pages/owner-permissions-page/owner-permissions-page.component';
import { OwnerSettingsPageComponent } from './pages/owner-settings-page/owner-settings-page.component';
import { OwnerSupportPageComponent } from './pages/owner-support-page/owner-support-page.component';
import { OwnerOrganisationDetailsPageComponent } from './pages/owner-organisation-details-page/owner-organisation-details-page.component';

const projectumAccessRoles = [
  'PLATFORM_OWNER'
];

const routes: Routes = [
  {
    path: 'organisations/:id',
    component: OwnerOrganisationDetailsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: projectumAccessRoles }
  },
  {
    path: '',
    component: OwnerLayoutComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: projectumAccessRoles },
    children: [
      { path: '', redirectTo: 'organisations', pathMatch: 'full' },
      { path: 'organisations', component: OwnerOrganisationsPageComponent },
      { path: 'dashboard', component: OwnerDashboardPageComponent },
      { path: 'resources', component: GmResourceManagementPageComponent },
      { path: 'create-organisation', component: CreateOrganisationPageComponent },
      { path: 'billing', component: OwnerBillingPageComponent },
      { path: 'analytics', component: OwnerAnalyticsPageComponent },
      { path: 'infrastructure', component: OwnerInfrastructurePageComponent },
      { path: 'support', component: OwnerSupportPageComponent },
      { path: 'permissions', component: OwnerPermissionsPageComponent },
      { path: 'settings', component: OwnerSettingsPageComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardOwnerRoutingModule {}