import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-gm-workspaces-page',
  templateUrl: './gm-workspaces-page.component.html',
  styleUrls: ['./gm-workspaces-page.component.scss']
})
export class GmWorkspacesPageComponent {
  constructor(private router: Router, private authService: AuthService) {}

  openProjectum(): void {
    this.router.navigate(['/gm/projectum']);
  }

  openMyDepartment(): void {
    this.router.navigate(['/gm/my-department']);
  }

  openAdmin(): void {
    this.router.navigate(['/gm/admin']);
  }
  
  canSeeAdmin(): boolean {
    const roles = this.authService.getRoles();

    return roles.includes('ROLE_PLATFORM_OWNER')
      || roles.includes('PLATFORM_OWNER')
      || roles.includes('ROLE_PLATFORM_ADMIN')
      || roles.includes('PLATFORM_ADMIN')
      || roles.includes('ROLE_ORG_ADMIN')
      || roles.includes('ORG_ADMIN')
      || roles.includes('ROLE_OWNER')
      || roles.includes('OWNER');
  }
}