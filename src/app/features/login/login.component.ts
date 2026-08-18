import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';
import { APPLICATION_ICONS } from 'src/app/core/config/application-icons';

type LoginMessageType = 'error' | 'success' | 'info';

interface LandingPreviewApp {
  name: string;
  description: string;
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
      name: 'Projectum',
      description: 'Portfolio, projects, finance, forecast, risks and actions.',
      group: 'Project Management',
      icon: APPLICATION_ICONS.projectum,
      badge: 'Available',
      enabled: true,
      selectedApp: 'Projectum'
    },
    {
      name: 'My Department',
      description: 'Department workload, capacity, resources and delivery view.',
      group: 'Department',
      icon: APPLICATION_ICONS.myDepartment,
      badge: 'Available',
      enabled: true,
      selectedApp: 'My Department'
    },
    {
      name: 'MY CS',
      description: 'Customer success workspace and customer project follow-up.',
      group: 'Customer Success',
      icon: APPLICATION_ICONS.myCs,
      badge: 'Available',
      enabled: true,
      selectedApp: 'MY_CS'
    },
    {
      name: 'Command Center',
      description: 'Executive company overview and organisation performance.',
      group: 'Platform',
      icon: APPLICATION_ICONS.companyDashboard,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'Command Center'
    },
    {
      name: 'My Expenses',
      description: 'Expense tracking and approval workspace.',
      group: 'Finance',
      icon: APPLICATION_ICONS.myExpenses,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My Expenses'
    },
    {
      name: 'My CRM',
      description: 'Leads, opportunities, accounts and commercial pipeline.',
      group: 'CRM',
      icon: APPLICATION_ICONS.myCrm,
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My CRM'
    },
    {
      name: 'My Ticketing',
      description: 'Support requests, service cases and operational tickets.',
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
    private route: ActivatedRoute
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
        this.setMessage('Your session expired. Sign in again to continue.', 'info');
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
      this.setMessage('Enter your email and password to continue.', 'error');
      return;
    }

    this.loading = true;
    this.auth.login(username, this.password).subscribe({
      next: res => {
        this.loading = false;

        if (res.passwordResetRequired) {
          this.forgotEmail = username;
          this.setMessage(res.message || 'Password reset is required for this account.', 'info');

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
          this.setMessage('Login succeeded, but no role was found for this account.', 'error');
          return;
        }
        this.setMessage('Login successful. Opening your workspace…', 'success');
        const destination = this.auth.getHomeRoute();
        this.setMessage('Login successful. Opening your account...', 'success');
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
          this.setMessage(errorText || 'Too many failed login attempts. Please try again later.', 'error');
          return;
        }

        this.setMessage('Invalid username or password.', 'error');
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
      this.setMessage('Passwords do not match.', 'error');
      return;
    }

    this.resetSubmitting = true;
    this.auth.resetPassword(this.resetToken, this.newPassword).subscribe({
      next: res => {
        this.resetSubmitting = false;
        this.setMessage(res.message || 'Password updated successfully.', 'success');

        setTimeout(() => {
          this.resetMode = false;
          this.selectedApp = 'Projectum';
          this.newPassword = '';
          this.confirmPassword = '';
        }, 1000);
      },
      error: err => {
        this.resetSubmitting = false;
        this.setMessage(err?.error?.message || 'Could not reset password.', 'error');
      }
    });
  }

  submitForgotPassword(): void {
    if (this.forgotSubmitting) {
      return;
    }

    this.setMessage('', 'info');

    if (!this.forgotEmail.trim()) {
      this.setMessage('Enter your email to request a password reset.', 'error');
      return;
    }

    this.forgotSubmitting = true;
    this.auth.requestPasswordReset(this.forgotEmail.trim()).subscribe({
      next: res => {
        this.forgotSubmitting = false;
        this.setMessage(res.message || 'Password reset request sent.', 'success');
        this.waitingApprovalMode = true;
      },
      error: err => {
        this.forgotSubmitting = false;
        this.setMessage(err?.error?.message || 'Could not send password reset request.', 'error');
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
        this.setMessage(res.message || 'Password reset status checked.', 'info');

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
        this.setMessage(err?.error?.message || 'Could not check approval status.', 'error');
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
