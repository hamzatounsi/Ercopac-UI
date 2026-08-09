import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getRoles', 'isLoggedIn', 'logout']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'forbidden', children: [] }])],
      providers: [RoleGuard, { provide: AuthService, useValue: auth }]
    });
    guard = TestBed.inject(RoleGuard);
  });

  it('accepts prefixed route configuration for a normalized Organisation Admin role', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.getRoles.and.returnValue(['ORG_ADMIN']);
    expect(guard.canActivate(routeWithRoles('ROLE_ORG_ADMIN'))).toBeTrue();
  });

  it('returns the forbidden route for an operational role mismatch', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.getRoles.and.returnValue(['ORG_ADMIN']);
    const result = guard.canActivate(routeWithRoles('PROJECT_MANAGER'));
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/forbidden');
  });

  function routeWithRoles(...roles: string[]): ActivatedRouteSnapshot {
    const route = new ActivatedRouteSnapshot();
    Object.defineProperty(route, 'data', { value: { roles } });
    return route;
  }
});
