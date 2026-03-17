import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const expectedRoles = route.data['roles'] as string[];
    const userRoles = this.auth.getRoles();

    const hasAccess = userRoles.some(role => expectedRoles.includes(role));

    if (hasAccess) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
