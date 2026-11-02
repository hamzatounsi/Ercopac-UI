import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { ProfileMenuComponent } from 'src/app/core/navigation/profile-menu.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

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
    TranslateModule,
    AppNavButtonsComponent, ProfileMenuComponent
  ],
  exports: [
    MyDepartmentPageComponent,
    ResourceSettingsPageComponent
  ]
})
export class DashboardDepartmentModule {}
