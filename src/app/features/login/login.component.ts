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

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.msg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        const roles = this.auth.getRoles();

        console.log('Decoded roles:', roles);

        if (!roles || roles.length === 0) {
          this.msg = 'Logged in ✅ but no role found in token';
          return;
        }

        if (roles.some(r => r.includes('PLATFORM_OWNER') || r.includes('PLATFORM_ADMIN'))) {
          this.router.navigate(['/owner']);
        } else if (roles.some(r => r.includes('GENERAL_MANAGER') || r.includes('ORG_ADMIN'))) {
          this.router.navigate(['/gm']);
        } else if (roles.some(r => r.includes('DEPARTMENT_MANAGER'))) {
          this.router.navigate(['/department']);
        } else if (roles.some(r => r.includes('EMPLOYEE'))) {
          this.router.navigate(['/employee']);
        } else {
          this.msg = 'Logged in ✅ but role not recognized';
        }
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.msg = 'Login failed ❌';
      }
    });
  }
}