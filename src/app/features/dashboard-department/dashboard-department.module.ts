import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { ProfileMenuComponent } from 'src/app/core/navigation/profile-menu.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MyDepartmentPageComponent } from './pages/my-department-page/my-department-page.component';
import { ResourceSettingsPageComponent } from './pages/resource-settings-page/resource-settings-page.component';
import { UppercaseNameDirective, UpperNamePipe } from 'src/app/core/names';
import { AdminToastComponent } from '../dashboard-org-admin/shared/admin-toast.component';
import { DepartmentResourcesTableComponent } from './components/department-resources-table/department-resources-table.component';
import { DepartmentSuppliersPanelComponent } from './components/department-suppliers-panel/department-suppliers-panel.component';
import { DepartmentHolidaysPanelComponent } from './components/department-holidays-panel/department-holidays-panel.component';

@NgModule({
  declarations: [
    MyDepartmentPageComponent,
    ResourceSettingsPageComponent,
    DepartmentResourcesTableComponent,
    DepartmentSuppliersPanelComponent,
    DepartmentHolidaysPanelComponent
  ],
  imports: [
    UppercaseNameDirective,
    UpperNamePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    AppNavButtonsComponent, ProfileMenuComponent,
    AdminToastComponent
  ],
  exports: [
    MyDepartmentPageComponent,
    ResourceSettingsPageComponent
  ]
})
export class DashboardDepartmentModule {}
