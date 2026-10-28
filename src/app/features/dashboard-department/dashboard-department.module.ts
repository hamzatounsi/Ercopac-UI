import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MyDepartmentPageComponent } from './pages/my-department-page/my-department-page.component';
import { ResourceSettingsPageComponent } from './pages/resource-settings-page/resource-settings-page.component';

@NgModule({
  declarations: [
    MyDepartmentPageComponent,
    ResourceSettingsPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppNavButtonsComponent
  ],
  exports: [
    MyDepartmentPageComponent,
    ResourceSettingsPageComponent
  ]
})
export class DashboardDepartmentModule {}
