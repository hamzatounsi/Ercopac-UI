import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from 'src/app/core/auth/role.guard';
import { OrgAdminLayoutComponent } from './layout/org-admin-layout.component';
import { OrgAdminDepartmentsComponent } from './pages/departments/org-admin-departments.component';
import { OrgAdminOverviewComponent } from './pages/overview/org-admin-overview.component';
import { OrgAdminProfileComponent } from './pages/profile/org-admin-profile.component';
import { OrgAdminRolesComponent } from './pages/roles/org-admin-roles.component';
import { OrgAdminResourceConfigurationComponent } from './pages/resource-configuration/org-admin-resource-configuration.component';
import { OrgAdminSettingsComponent } from './pages/settings/org-admin-settings.component';
import { OrgAdminUsersComponent } from './pages/users/org-admin-users.component';

const routes: Routes = [{
  path: '',
  component: OrgAdminLayoutComponent,
  canActivate: [RoleGuard],
  data: { roles: ['ORG_ADMIN'] },
  children: [
    { path: '', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'overview', component: OrgAdminOverviewComponent, data: { title: 'Overview', description: 'Organisation health, capacity, and configuration at a glance.' } },
    { path: 'profile', component: OrgAdminProfileComponent, data: { title: 'Organisation profile', description: 'Maintain the organisation details your team can use.' } },
    { path: 'users', component: OrgAdminUsersComponent, data: { title: 'Users', description: 'Create, assign, and manage accounts in your organisation.' } },
    { path: 'roles', component: OrgAdminRolesComponent, data: { title: 'Roles & permissions', description: 'Review role responsibilities and effective module access.' } },
    { path: 'departments', component: OrgAdminDepartmentsComponent, data: { title: 'Departments', description: 'Structure the organisation and assign department managers.' } },
    { path: 'resources', component: OrgAdminResourceConfigurationComponent, data: { title: 'Resource configuration', description: 'Maintain the project classifications and customer directory supported by this organisation.' } },
    { path: 'settings', component: OrgAdminSettingsComponent, data: { title: 'Security settings', description: 'Apply password, session, and account-recovery controls.' } },
    { path: '**', redirectTo: 'overview' }
  ]
}];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class OrgAdminRoutingModule {}
