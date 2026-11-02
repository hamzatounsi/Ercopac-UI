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
    { path: 'overview', component: OrgAdminOverviewComponent, data: { title: 'orgAdmin.pages.overview.title', description: 'orgAdmin.pages.overview.description' } },
    { path: 'profile', component: OrgAdminProfileComponent, data: { title: 'orgAdmin.pages.profile.title', description: 'orgAdmin.pages.profile.description' } },
    { path: 'users', component: OrgAdminUsersComponent, data: { title: 'orgAdmin.pages.users.title', description: 'orgAdmin.pages.users.description' } },
    { path: 'roles', component: OrgAdminRolesComponent, data: { title: 'orgAdmin.pages.roles.title', description: 'orgAdmin.pages.roles.description' } },
    { path: 'departments', component: OrgAdminDepartmentsComponent, data: { title: 'orgAdmin.pages.departments.title', description: 'orgAdmin.pages.departments.description' } },
    { path: 'resources', component: OrgAdminResourceConfigurationComponent, data: { title: 'orgAdmin.pages.resources.title', description: 'orgAdmin.pages.resources.description' } },
    { path: 'settings', component: OrgAdminSettingsComponent, data: { title: 'orgAdmin.pages.settings.title', description: 'orgAdmin.pages.settings.description' } },
    { path: '**', redirectTo: 'overview' }
  ]
}];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class OrgAdminRoutingModule {}
