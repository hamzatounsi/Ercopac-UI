import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { OrgAdminLayoutComponent } from './layout/org-admin-layout.component';
import { OrgAdminRoutingModule } from './org-admin-routing.module';
import { OrgAdminDepartmentsComponent } from './pages/departments/org-admin-departments.component';
import { OrgAdminOverviewComponent } from './pages/overview/org-admin-overview.component';
import { OrgAdminProfileComponent } from './pages/profile/org-admin-profile.component';
import { OrgAdminRolesComponent } from './pages/roles/org-admin-roles.component';
import { OrgAdminResourceConfigurationComponent } from './pages/resource-configuration/org-admin-resource-configuration.component';
import { OrgAdminSettingsComponent } from './pages/settings/org-admin-settings.component';
import { OrgAdminUsersComponent } from './pages/users/org-admin-users.component';
import { AdminToastComponent } from './shared/admin-toast.component';

@NgModule({
  declarations: [
    OrgAdminLayoutComponent,
    OrgAdminOverviewComponent,
    OrgAdminProfileComponent,
    OrgAdminUsersComponent,
    OrgAdminRolesComponent,
    OrgAdminDepartmentsComponent,
    OrgAdminResourceConfigurationComponent,
    OrgAdminSettingsComponent,
    AdminToastComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, OrgAdminRoutingModule]
})
export class OrgAdminModule {}
