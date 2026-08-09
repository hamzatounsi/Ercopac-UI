import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { OrgAdminService } from '../../services/org-admin.service';
import { OrgAdminOverviewComponent } from './org-admin-overview.component';

describe('OrgAdminOverviewComponent', () => {
  let fixture: ComponentFixture<OrgAdminOverviewComponent>;

  beforeEach(async () => {
    const service = jasmine.createSpyObj<OrgAdminService>('OrgAdminService', ['getOverview']);
    service.getOverview.and.returnValue(of({
      organisation: { name: 'Acme', code: 'ACME', country: 'DE', domain: 'acme.test', status: 'ACTIVE', plan: 'STARTER', userLimit: 10, orgAdminLicenceLimit: 2, projectManagerLicenceLimit: 2, departmentManagerLicenceLimit: 3, employeeLicenceLimit: 10, salesManagerLicenceLimit: 2, clientLicenceLimit: 4, createdAt: '2026-01-01T00:00:00' },
      totalUsers: 3, activeUsers: 2, inactiveUsers: 1, departments: 1, pendingPasswordResets: 0,
      usersByRole: [{ role: 'ORG_ADMIN', label: 'Organisation Admin', total: 1, active: 1 }],
      configurationWarnings: []
    }));
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [OrgAdminOverviewComponent],
      providers: [{ provide: OrgAdminService, useValue: service }]
    }).compileComponents();
    fixture = TestBed.createComponent(OrgAdminOverviewComponent);
    fixture.detectChanges();
  });

  it('renders real organisation data and healthy configuration state', () => {
    expect(fixture.nativeElement.textContent).toContain('Acme');
    expect(fixture.nativeElement.textContent).toContain('Configuration looks healthy');
  });
});
