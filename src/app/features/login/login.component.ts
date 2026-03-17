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

  submit() {
    this.msg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        const roles = this.auth.getRoles(); // must return string[]

        if (!roles || roles.length === 0) {
          this.msg = 'Logged in ✅ but no role found in token';
          return;
        }

        if (roles.some(r => r.includes('GENERAL_MANAGER'))) {
          this.router.navigate(['/gm']);
        } 
        else if (roles.some(r => r.includes('DEPARTMENT_MANAGER'))) {
          this.router.navigate(['/department']);
        } 
        else if (roles.some(r => r.includes('EMPLOYEE'))) {
          this.router.navigate(['/employee']);
        } 
        else {
          this.msg = 'Logged in ✅ but role not recognized';
        }
      },
      error: () => {
        this.msg = 'Login failed ❌';
      }
    });
  }
}
