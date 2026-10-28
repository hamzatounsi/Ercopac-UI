import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/auth/auth.service';

import { PrioritiesSettingsComponent } from './priorities-settings.component';

describe('PrioritiesSettingsComponent', () => {
  let component: PrioritiesSettingsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [PrioritiesSettingsComponent],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: () => true } }],
      schemas: [NO_ERRORS_SCHEMA]
    });
    component = TestBed.createComponent(PrioritiesSettingsComponent).componentInstance;
  });

  it('formats SLA durations', () => {
    expect(component.duration(30)).toBe('30 min');
    expect(component.duration(90)).toBe('1 h 30 min');
    expect(component.duration(1440 * 3)).toBe('3 days');
  });

  it('rejects a first response target longer than the resolution target', () => {
    expect(component.rowError({ priority: 'HIGH', label: 'High', firstResponseMinutes: 600, resolutionHours: 8 })).toContain('before resolution');
    expect(component.rowError({ priority: 'HIGH', label: '', firstResponseMinutes: 60, resolutionHours: 8 })).toContain('label');
    expect(component.rowError({ priority: 'HIGH', label: 'High', firstResponseMinutes: 60, resolutionHours: 8 })).toBe('');
  });
});
