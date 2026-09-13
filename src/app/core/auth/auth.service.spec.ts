import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('normalizes role prefixes and routes Organisation Admin to its isolated home', () => {
    localStorage.setItem('token', token({ roles: ['ROLE_ORG_ADMIN'], exp: Math.floor(Date.now() / 1000) + 300 }));
    expect(service.getRoles()).toEqual(['ORG_ADMIN']);
    expect(service.getHomeRoute()).toBe('/org-admin');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('routes every single role directly to its primary module', () => {
    const expiry = Math.floor(Date.now() / 1000) + 300;
    const expectedHomes: Array<[string, string]> = [
      ['PLATFORM_OWNER', '/owner'],
      ['PROJECT_MANAGER', '/gm/projectum'],
      ['DEPARTMENT_MANAGER', '/department'],
      ['EMPLOYEE', '/employee'],
      ['SALES_MANAGER', '/crm/opportunities'],
      ['CLIENT', '/tickets']
    ];

    expectedHomes.forEach(([role, home]) => {
      localStorage.setItem('token', token({ roles: [role], exp: expiry }));
      expect(service.getHomeRoute()).withContext(role).toBe(home);
    });
  });

  it('routes multiple roles to workspace and deduplicates modules', () => {
    const expiry = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem('token', token({ roles: ['PROJECT_MANAGER', 'SALES_MANAGER'], exp: expiry }));
    expect(service.getHomeRoute()).toBe('/workspace');
    expect(service.getAccessibleWorkspaceModules().map(module => module.key)).toEqual(['PROJECTUM', 'CRM']);

    localStorage.setItem('token', token({ roles: ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD'], exp: expiry }));
    expect(service.getAccessibleWorkspaceModules().map(module => module.key)).toEqual(['PROJECTUM']);
  });

  it('treats an expired token as logged out', () => {
    localStorage.setItem('token', token({ roles: ['ORG_ADMIN'], exp: Math.floor(Date.now() / 1000) - 30 }));
    expect(service.isLoggedIn()).toBeFalse();
  });

  function token(payload: object): string {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
  }
});
