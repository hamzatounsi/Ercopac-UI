import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowedRoles = ((route.data['roles'] as string[]) || [])
      .map(role => role.replace(/^ROLE_/, ''));
    const userRoles = this.auth.getRoles();

    if (!this.auth.isLoggedIn()) {
      this.auth.logout();
      return this.router.createUrlTree(['/']);
    }

    const excludedRoles = ((route.data['excludeRoles'] as string[]) || [])
      .map(role => role.replace(/^ROLE_/, ''));
    if (userRoles.some(role => excludedRoles.includes(role))) {
      return this.router.createUrlTree(['/forbidden']);
    }

    const adminRole = userRoles.includes('PLATFORM_OWNER') ? 'PLATFORM_OWNER'
      : userRoles.length === 1 && userRoles[0] === 'ORG_ADMIN' ? 'ORG_ADMIN' : null;
    const hasAccess = adminRole
      ? allowedRoles.length === 1 && allowedRoles[0] === adminRole
      : userRoles.some(userRole => allowedRoles.includes(userRole));

    if (!hasAccess) {
      return this.router.createUrlTree(['/forbidden']);
    }

    return true;
  }
}
