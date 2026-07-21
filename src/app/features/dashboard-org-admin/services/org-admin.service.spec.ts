import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ADMIN_URL, API_ORG_ADMIN_URL } from 'src/app/core/config/api.config';
import { OrgAdminService } from './org-admin.service';

describe('OrgAdminService', () => {
  let service: OrgAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(OrgAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads users without sending an organisation identifier', () => {
    service.getUsers({ search: 'alex', role: 'EMPLOYEE', page: 0, size: 20 }).subscribe();
    const request = http.expectOne(req => req.url === `${API_ORG_ADMIN_URL}/users`);
    expect(request.request.params.has('organisationId')).toBeFalse();
    expect(request.request.params.get('search')).toBe('alex');
    expect(request.request.params.get('role')).toBe('EMPLOYEE');
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('uses the dedicated tenant-scoped endpoint for status changes', () => {
    service.updateUserStatus(42, false).subscribe();
    const request = http.expectOne(`${API_ORG_ADMIN_URL}/users/42/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ active: false });
    request.flush({});
  });

  it('uses the existing organisation-scoped configuration contract', () => {
    service.getCategories().subscribe();
    const request = http.expectOne(`${API_ADMIN_URL}/categories`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('organisationId')).toBeFalse();
    request.flush([]);
  });
});
