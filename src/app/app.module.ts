// Path: src/app/app.module.ts
// REPLACE YOUR ENTIRE FILE WITH THIS — do not add anything else

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/auth/auth.interceptor';
import { LoginComponent } from './features/login/login.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';
import { DashboardDepartmentModule } from './features/dashboard-department/dashboard-department.module';

// ── DO NOT import CrmLayoutComponent here ─────────────────────
// It belongs to DashboardCrmModule (lazy loaded).
// DO NOT import any dashboard-crm components here.

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardDmComponent,
    DashboardEmployeeComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppRoutingModule,
    DashboardDepartmentModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }