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
    localStorage.setItem('token', token({ role: 'ROLE_ORG_ADMIN', exp: Math.floor(Date.now() / 1000) + 300 }));
    expect(service.getRoles()).toEqual(['ORG_ADMIN']);
    expect(service.getHomeRoute()).toBe('/org-admin');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('routes platform ownership directly and operational roles through the workspace', () => {
    const expiry = Math.floor(Date.now() / 1000) + 300;
    const expectedHomes: Array<[string, string]> = [
      ['PLATFORM_OWNER', '/owner'],
      ['PROJECT_MANAGER', '/workspace'],
      ['DEPARTMENT_MANAGER', '/workspace'],
      ['EMPLOYEE', '/employee'],
      ['SALES_MANAGER', '/workspace'],
      ['CLIENT', '/workspace']
    ];

    expectedHomes.forEach(([role, home]) => {
      localStorage.setItem('token', token({ role, exp: expiry }));
      expect(service.getHomeRoute()).withContext(role).toBe(home);
    });
  });

  it('treats an expired token as logged out', () => {
    localStorage.setItem('token', token({ role: 'ORG_ADMIN', exp: Math.floor(Date.now() / 1000) - 30 }));
    expect(service.isLoggedIn()).toBeFalse();
  });

  function token(payload: object): string {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
  }
});
