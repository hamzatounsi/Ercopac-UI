// Path: src/app/features/dashboard-crm/dashboard-crm.module.ts
// REPLACE your entire file with this

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { DashboardCrmRoutingModule } from './dashboard-crm-routing.module';

import { CrmLayoutComponent }            from './layouts/crm-layout/crm-layout.component';
import { CrmDashboardPageComponent }     from './pages/crm-dashboard-page/crm-dashboard-page.component';
import { CrmLeadsPageComponent }         from './pages/crm-leads-page/crm-leads-page.component';
import { CrmOpportunitiesPageComponent } from './pages/crm-opportunities-page/crm-opportunities-page.component';
import { CrmManagerViewPageComponent }   from './pages/crm-manager-view-page/crm-manager-view-page.component';
import { CrmAnalyticsPageComponent }     from './pages/crm-analytics-page/crm-analytics-page.component';
import { CrmSettingsPageComponent }      from './pages/crm-settings-page/crm-settings-page.component';

@NgModule({
  declarations: [
    CrmLayoutComponent,
    CrmDashboardPageComponent,
    CrmLeadsPageComponent,
    CrmOpportunitiesPageComponent,
    CrmManagerViewPageComponent,
    CrmAnalyticsPageComponent,
    CrmSettingsPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,           // ← fixes [(ngModel)]
    ReactiveFormsModule,   // ← fixes formGroup
    RouterModule,          // ← fixes routerLink, routerLinkActive
    HttpClientModule,      // ← fixes HttpClient
    DashboardCrmRoutingModule,
  ]
})
export class DashboardCrmModule {}