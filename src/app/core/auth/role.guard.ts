import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles = route.data['roles'] as string[];
    const userRoles = this.auth.getRoles();

    const hasAccess = userRoles.some(userRole =>
      allowedRoles.includes(userRole) ||
      allowedRoles.includes('ROLE_' + userRole)
    );

    if (!hasAccess) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}