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
      return this.router.createUrlTree(['/login']);
    }

    const hasAccess = userRoles.some(userRole => allowedRoles.includes(userRole));

    if (!hasAccess) {
      return this.router.createUrlTree(['/forbidden']);
    }

    return true;
  }
}
