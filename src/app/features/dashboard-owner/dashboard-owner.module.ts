import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardOwnerRoutingModule } from './dashboard-owner-routing.module';

import { OwnerDashboardPageComponent } from './pages/owner-dashboard-page/owner-dashboard-page.component';
import { CreateOrganisationPageComponent } from './pages/create-organisation-page/create-organisation-page.component';
import { OwnerLayoutComponent } from './pages/owner-layout/owner-layout.component';
import { OwnerOrganisationsPageComponent } from './pages/owner-organisations-page/owner-organisations-page.component';
import { OwnerBillingPageComponent } from './pages/owner-billing-page/owner-billing-page.component';
import { OwnerAnalyticsPageComponent } from './pages/owner-analytics-page/owner-analytics-page.component';
import { OwnerInfrastructurePageComponent } from './pages/owner-infrastructure-page/owner-infrastructure-page.component';
import { OwnerSupportPageComponent } from './pages/owner-support-page/owner-support-page.component';
import { OwnerPermissionsPageComponent } from './pages/owner-permissions-page/owner-permissions-page.component';
import { OwnerSettingsPageComponent } from './pages/owner-settings-page/owner-settings-page.component';
import { OwnerOrganisationDetailsPageComponent } from './pages/owner-organisation-details-page/owner-organisation-details-page.component';

@NgModule({
  declarations: [
    OwnerDashboardPageComponent,
    CreateOrganisationPageComponent,
    OwnerLayoutComponent,
    OwnerOrganisationsPageComponent,
    OwnerBillingPageComponent,
    OwnerAnalyticsPageComponent,
    OwnerInfrastructurePageComponent,
    OwnerSupportPageComponent,
    OwnerPermissionsPageComponent,
    OwnerSettingsPageComponent,
    OwnerOrganisationDetailsPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DashboardOwnerRoutingModule
  ]
})
export class DashboardOwnerModule {}