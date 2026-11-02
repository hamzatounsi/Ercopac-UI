import { AppNavButtonsComponent } from 'src/app/core/navigation/app-nav-buttons.component';
import { ProfileMenuComponent } from 'src/app/core/navigation/profile-menu.component';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/auth/auth.interceptor';
import { LoginComponent } from './features/login/login.component';
import { GmWorkspacesPageComponent } from './features/dashboard-gm/pages/gm_workspaces-page/gm-workspaces-page/gm-workspaces-page.component';
import { DashboardDmComponent } from './features/dashboard-dm/dashboard-dm.component';
import { DashboardEmployeeComponent } from './features/dashboard-employee/dashboard-employee.component';
import { DashboardDepartmentModule } from './features/dashboard-department/dashboard-department.module';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';
import { ActiveLocale, LanguageService } from './core/i18n/language.service';

// One JSON file per language, downloaded only when that language is used.
export function createTranslateLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

// Load the initial language before the first render, so no untranslated keys flash on screen.
export function initLanguage(language: LanguageService): () => Promise<void> {
  return () => language.use(language.initialLanguage());
}


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    GmWorkspacesPageComponent,
    DashboardDmComponent,
    DashboardEmployeeComponent,
    ForbiddenComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppRoutingModule,
    DashboardDepartmentModule,
    AppNavButtonsComponent, ProfileMenuComponent,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: APP_INITIALIZER, useFactory: initLanguage, deps: [LanguageService], multi: true },
    { provide: LOCALE_ID, useFactory: (languages: LanguageService) => new ActiveLocale(languages), deps: [LanguageService] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
