import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  msg = '';

  selectedApp = '';

  constructor(private auth: AuthService, private router: Router) {}

  selectApp(app: string): void {
    this.selectedApp = app;
    this.msg = '';
  }

  submit(): void {
    this.msg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        const roles = this.auth.getRoles();

        if (!roles || roles.length === 0) {
          this.msg = 'Logged in ✅ but no role found in token';
          return;
        }

        if (this.selectedApp === 'My Department') {
          if (
            roles.some(r =>
              r.includes('GENERAL_MANAGER') ||
              r.includes('ORG_ADMIN') ||
              r.includes('PMO') ||
              r.includes('PLATFORM_OWNER') ||
              r.includes('PLATFORM_ADMIN')
            )
          ) {
            this.router.navigate(['/gm/my-department']);
          } else if (roles.some(r => r.includes('DEPARTMENT_MANAGER'))) {
            this.router.navigate(['/department']);
          } else {
            this.msg = 'You do not have access to My Department';
          }

          return;
        }

        if (this.selectedApp === 'Projectum') {
          if (roles.some(r => r.includes('PLATFORM_OWNER') || r.includes('PLATFORM_ADMIN'))) {
            this.router.navigate(['/owner']);
          } else if (roles.some(r => r.includes('GENERAL_MANAGER') || r.includes('ORG_ADMIN') || r.includes('PMO'))) {
            this.router.navigate(['/gm/projectum']);
          } else if (roles.some(r => r.includes('DEPARTMENT_MANAGER'))) {
            this.router.navigate(['/department']);
          } else if (roles.some(r => r.includes('EMPLOYEE'))) {
            this.router.navigate(['/employee']);
          } else {
            this.msg = 'Logged in ✅ but role not recognized';
          }
        }
      },
      error: err => {
        console.error('Login failed:', err);
        this.msg = 'Login failed ❌';
      }
    });
  }
}