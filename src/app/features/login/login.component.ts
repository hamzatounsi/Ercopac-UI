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
    console.log('LOGIN CLICKED', this.username, this.password);

    this.msg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        console.log('LOGIN RESPONSE', res);
        console.log('TOKEN', this.auth.getToken());
        console.log('ROLES', this.auth.getRoles());

        const roles = this.auth.getRoles();

        if (!roles || roles.length === 0) {
          this.msg = 'Logged in but no role found';
          return;
        }

        const role = roles[0];

        if (role.includes('PLATFORM_OWNER')) {
          this.router.navigate(['/owner']);
          return;
        }

        if (role.includes('GENERAL_MANAGER') || role.includes('ORG_ADMIN')) {
          this.router.navigate(['/gm/projectum']);
          return;
        }

        if (role.includes('DEPARTMENT_MANAGER')) {
          this.router.navigate(['/department']);
          return;
        }

        if (role.includes('EMPLOYEE')) {
          this.router.navigate(['/employee']);
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
}