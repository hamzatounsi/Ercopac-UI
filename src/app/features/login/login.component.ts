import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

type LoginMessageType = 'error' | 'success' | 'info';

interface WorkspaceApp {
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

  workspaceApps: WorkspaceApp[] = [
    {
      name: 'Projectum',
      description: 'Portfolio, projects, finance, forecast, risks and actions.',
      group: 'Project Management',
      icon: 'space_dashboard',
      badge: 'Available',
      enabled: true,
      selectedApp: 'Projectum'
    },
    {
      name: 'My Department',
      description: 'Department workload, capacity, resources and delivery view.',
      group: 'Department',
      icon: 'groups',
      badge: 'Available',
      enabled: true,
      selectedApp: 'My Department'
    },
    {
      name: 'MY CS',
      description: 'Customer success workspace and customer project follow-up.',
      group: 'Customer Success',
      icon: 'support_agent',
      badge: 'Available',
      enabled: true,
      selectedApp: 'MY_CS'
    },
    {
      name: 'Company Dashboard',
      description: 'Executive company overview and organisation performance.',
      group: 'Platform',
      icon: 'domain',
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'Company Dashboard'
    },
    {
      name: 'My Expenses',
      description: 'Expense tracking and approval workspace.',
      group: 'Finance',
      icon: 'receipt_long',
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My Expenses'
    },
    {
      name: 'My CRM',
      description: 'Leads, opportunities, accounts and commercial pipeline.',
      group: 'CRM',
      icon: 'handshake',
      badge: 'Coming soon',
      enabled: false,
      selectedApp: 'My CRM'
    },
    {
      name: 'My Ticketing',
      description: 'Support requests, service cases and operational tickets.',
      group: 'Support',
      icon: 'confirmation_number',
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

        const roles = this.auth.getRoles();

        if (!roles || roles.length === 0) {
          this.setMessage('Login succeeded, but no role was found for this account.', 'error');
          return;
        }

        const role = roles[0];

        if (role === 'ORG_ADMIN') {
          this.setMessage('Login successful.', 'success');
          setTimeout(() => this.router.navigate(['/org-admin']), 500);
          return;
        }

        if (role.includes('DEPARTMENT_MANAGER')) {
          this.setMessage('Login successful.', 'success');
          setTimeout(() => this.router.navigate(['/department']), 900);
          return;
        }

        if (role === 'GENERAL_MANAGER') {
          this.setMessage('Login successful.', 'success');

          setTimeout(() => {
            if (this.selectedApp === 'MY_CS') {
              this.router.navigate(['/gm/my-cs']);
            } else if (this.selectedApp === 'My Department') {
              this.router.navigate(['/gm/my-department']);
            } else {
              this.router.navigate(['/gm']);
            }
          }, 900);

          return;
        }

        if (role === 'EMPLOYEE') {
          this.setMessage('Login successful.', 'success');
          setTimeout(() => this.router.navigate(['/employee']), 500);
          return;
        }

        if (role === 'SALES_MANAGER' || role === 'CLIENT') {
          this.router.navigate(['/tickets']);
          return;
        }

        if (role === 'PLATFORM_ADMIN') {
          this.router.navigate(['/owner']);
          return;
        }

        if (role.includes('PLATFORM_OWNER')) {
          this.router.navigate(['/owner']);
          return;
        }

        this.setMessage('Role not recognized: ' + role, 'error');
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
