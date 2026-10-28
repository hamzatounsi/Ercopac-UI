import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/auth/auth.service';

import { StatusesSettingsComponent } from './statuses-settings.component';

describe('StatusesSettingsComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [StatusesSettingsComponent],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: () => true } }],
      schemas: [NO_ERRORS_SCHEMA]
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('loads the statuses and only saves valid labels', () => {
    const fixture = TestBed.createComponent(StatusesSettingsComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/tickets/settings')).flush({
      statuses: [{ status: 'OPEN', label: 'Open', color: 'blue' }], priorities: []
    });
    const c = fixture.componentInstance;
    expect(c.rows.length).toBe(1);
    expect(c.dirty).toBeFalse();

    c.rows[0].label = '  ';
    c.save();
    http.expectNone(r => r.method === 'PUT');
    expect(c.invalid).toBeTrue();

    c.rows[0].label = 'New';
    c.save();
    const put = http.expectOne(r => r.method === 'PUT' && r.url.endsWith('/settings/statuses'));
    expect(put.request.body[0].label).toBe('New');
    put.flush({ statuses: [{ status: 'OPEN', label: 'New', color: 'blue' }], priorities: [] });
    expect(c.dirty).toBeFalse();
    http.verify();
  });
});
