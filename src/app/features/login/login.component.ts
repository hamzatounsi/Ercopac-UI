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

  showPassword = false;
  selectedApp = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

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
          this.msg = 'Logged in but no role found';
          return;
        }

        const role = roles[0];

        if (
              role.includes('GENERAL_MANAGER') ||
              role.includes('ORG_ADMIN') ||
              role.includes('DEPARTMENT_MANAGER') ||
              role.includes('EMPLOYEE')
            ) {
              this.msg = 'Login successful ✅';

              setTimeout(() => {
                this.router.navigate(['/gm']);
              }, 900);

              return;
            }

        if (role.includes('PLATFORM_OWNER')) {
          this.router.navigate(['/owner']);
          return;
        }
        this.msg = 'Role not recognized: ' + role;
      },
      error: err => {
        console.error('Login failed:', err);
        this.msg = 'Login failed ❌';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}