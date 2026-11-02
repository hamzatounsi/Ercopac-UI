import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { APPLICATION_ICONS } from 'src/app/core/config/application-icons';
import { I18nService } from 'src/app/core/i18n/i18n.service';

type LoginMessageType = 'error' | 'success' | 'info';

interface LandingPreviewApp {
  key: string;
  name: string;
  group: string;
  icon: string;
  badge: string;
  enabled: boolean;
  selectedApp: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  @ViewChild('usernameInput') usernameInput?: ElementRef<HTMLInputElement>;

  username = '';
  password = '';
  msg = '';
  messageType: LoginMessageType = 'info';

  showPassword = false;
  selectedApp = '';

  forgotMode = false;
  forgotEmail = '';

  resetMode = false;
  resetToken = '';
  newPassword = '';
  confirmPassword = '';
  waitingApprovalMode = false;

  submitted = false;
  loading = false;
  forgotSubmitting = false;
  resetSubmitting = false;
  approvalChecking = false;

  landingPreviewApps: LandingPreviewApp[] = [
    {
      key: 'projectum',
      name: 'Projectum',
      group: 'Project Management',
      icon: APPLICATION_ICONS.projectum,
      badge: 'Available',
      enabled: true,
      selectedApp: 'Projectum'
    },
    {
      key: 'myDepartment',
      name: 'My Department',
      group: 'Department',
      icon: APPLICATION_ICONS.myDepartment,
      badge: 'Available',
      enabled: true,
      selectedApp: 'My Department'
    },
    {
      key: 'myCs',
      name: 'MY CS',
      group: 'Customer Success',
      icon: APPLICATION_ICONS.myCs,
      badge: 'Available',
      enabled: true,
      selectedApp: 'MY_CS'
    },
    {
      key: 'commandCenter',
      name: 'Command Center',
      group: 'Platform',
      icon: APPLICATION_ICONS.companyDashboard,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'Command Center'
    },
    {
      key: 'myExpenses',
      name: 'My Expenses',
      group: 'Finance',
      icon: APPLICATION_ICONS.myExpenses,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My Expenses'
    },
    {
      key: 'myCrm',
      name: 'My CRM',
      group: 'CRM',
      icon: APPLICATION_ICONS.myCrm,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My CRM'
    },
    {
      key: 'myTicketing',
      name: 'My Ticketing',
      group: 'Support',
      icon: APPLICATION_ICONS.ticketing,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My Ticketing'
    }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private preferences: PreferencesService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigateByUrl(this.auth.getHomeRoute());
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.resetMode = true;
        this.resetToken = params['token'];
        this.selectedApp = 'Projectum';
      }
      if (params['sessionExpired']) {
        this.setMessage(this.i18n.t('login.sessionExpired'), 'info');
      }
    });
  }

  selectApp(app: string): void {
    this.selectedApp = app;
    this.setMessage('', 'info');
    this.submitted = false;
    this.forgotMode = false;
    this.resetMode = false;
    this.waitingApprovalMode = false;
    this.password = '';
    setTimeout(() => this.usernameInput?.nativeElement.focus());
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.setMessage('', 'info');

    const username = this.username.trim();

    if (!username || !this.password) {
      this.setMessage(this.i18n.t('login.enterEmailPassword'), 'error');
      return;
    }

    this.loading = true;
    this.auth.login(username, this.password).subscribe({
      next: res => {
        this.loading = false;

        if (res.passwordResetRequired) {
          this.forgotEmail = username;
          this.setMessage(this.i18n.server(res.message, 'login.passwordResetRequired'), 'info');

          if (res.resetStatus === 'APPROVED' && res.resetToken) {
            this.resetMode = true;
            this.forgotMode = false;
            this.waitingApprovalMode = false;
            this.resetToken = res.resetToken;
          } else {
            this.forgotMode = true;
            this.waitingApprovalMode = true;
          }

          return;
        }

        if (this.auth.getRoles().length === 0) {
          this.setMessage(this.i18n.t('login.noRole'), 'error');
          return;
        }
        this.setMessage(this.i18n.t('login.openingWorkspace'), 'success');
        this.preferences.loadFromServer();
        const destination = this.auth.getHomeRoute();
        this.setMessage(this.i18n.t('login.openingWorkspace'), 'success');
        setTimeout(() => this.router.navigateByUrl(destination), 350);
      },
      error: err => {
        this.loading = false;

        const errorText =
          err?.error?.message ||
          err?.error?.error ||
          err?.message ||
          '';

        if (errorText.includes('PASSWORD_RESET_REQUIRED')) {
          this.forgotEmail = username;
          this.checkResetApproval();
          return;
        }

        if (err?.status === 429) {
          this.setMessage(this.i18n.server(errorText, 'login.tooManyAttempts'), 'error');
          return;
        }

        this.setMessage(this.i18n.t('login.invalidCredentials'), 'error');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  openForgotPassword(): void {
    this.forgotMode = true;
    this.forgotEmail = this.username.trim();
    this.setMessage('', 'info');
  }

  backToLogin(): void {
    this.forgotMode = false;
    this.setMessage('', 'info');
  }

  submitResetPassword(): void {
    if (this.resetSubmitting) {
      return;
    }

    this.setMessage('', 'info');

    if (this.newPassword !== this.confirmPassword) {
      this.setMessage(this.i18n.t('login.passwordsDoNotMatch'), 'error');
      return;
    }

    this.resetSubmitting = true;
    this.auth.resetPassword(this.resetToken, this.newPassword).subscribe({
      next: res => {
        this.resetSubmitting = false;
        this.setMessage(this.i18n.server(res.message, 'login.passwordUpdated'), 'success');

        setTimeout(() => {
          this.resetMode = false;
          this.selectedApp = 'Projectum';
          this.newPassword = '';
          this.confirmPassword = '';
        }, 1000);
      },
      error: err => {
        this.resetSubmitting = false;
        this.setMessage(this.i18n.error(err, 'login.couldNotResetPassword'), 'error');
      }
    });
  }

  submitForgotPassword(): void {
    if (this.forgotSubmitting) {
      return;
    }

    this.setMessage('', 'info');

    if (!this.forgotEmail.trim()) {
      this.setMessage(this.i18n.t('login.enterEmailForReset'), 'error');
      return;
    }

    this.forgotSubmitting = true;
    this.auth.requestPasswordReset(this.forgotEmail.trim()).subscribe({
      next: res => {
        this.forgotSubmitting = false;
        this.setMessage(this.i18n.server(res.message, 'login.passwordResetRequestSent'), 'success');
        this.waitingApprovalMode = true;
      },
      error: err => {
        this.forgotSubmitting = false;
        this.setMessage(this.i18n.error(err, 'login.couldNotSendReset'), 'error');
      }
    });
  }

  checkResetApproval(): void {
    if (this.approvalChecking) {
      return;
    }

    this.setMessage('', 'info');

    this.approvalChecking = true;
    this.auth.checkApprovedReset(this.forgotEmail.trim()).subscribe({
      next: res => {
        this.approvalChecking = false;
        this.setMessage(this.i18n.server(res.message, 'login.resetStatusChecked'), 'info');

        if (res.approved && res.token) {
          this.resetMode = true;
          this.forgotMode = false;
          this.waitingApprovalMode = false;
          this.resetToken = res.token;
          return;
        }

        this.waitingApprovalMode = true;
      },
      error: err => {
        this.approvalChecking = false;
        this.setMessage(this.i18n.error(err, 'login.couldNotCheckApproval'), 'error');
      }
    });
  }

  get usernameInvalid(): boolean {
    return this.submitted && !this.username.trim();
  }

  get passwordInvalid(): boolean {
    return this.submitted && !this.password;
  }

  private setMessage(message: string, type: LoginMessageType): void {
    this.msg = message;
    this.messageType = type;
  }
}
