import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/auth/auth.service';

import { StatusesSettingsComponent } from './statuses-settings.component';
import { translateTestingModule } from 'src/app/core/i18n/translate-testing';

const status = (id: number, name: string, extra: object = {}) => ({ id, code: name.toUpperCase(), name, color: 'blue', displayOrder: id, isDefault: false, isClosed: false, active: true, ticketCount: 0, ...extra });

describe('StatusesSettingsComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, translateTestingModule()],
      declarations: [StatusesSettingsComponent],
      providers: [{ provide: AuthService, useValue: { hasAnyRole: () => true } }],
      schemas: [NO_ERRORS_SCHEMA]
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('starts empty and creates a status with a unique name', () => {
    const fixture = TestBed.createComponent(StatusesSettingsComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/tickets/statuses')).flush([status(1, 'Open', { isDefault: true })]);
    const c = fixture.componentInstance;
    expect(c.rows.length).toBe(1);

    c.add();
    c.draft!.name = ' open ';
    c.save();
    http.expectNone(r => r.method === 'POST');
    expect(c.nameError).toBe('ticketing.statusesAdmin.nameTaken');

    c.draft!.name = 'Waiting for parts';
    c.save();
    const post = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/settings/statuses'));
    expect(post.request.body.name).toBe('Waiting for parts');
  });

  it('asks where to move the tickets of a status in use', () => {
    const fixture = TestBed.createComponent(StatusesSettingsComponent);
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/tickets/statuses')).flush([status(1, 'Open', { isDefault: true }), status(2, 'Done', { isClosed: true, ticketCount: 4 })]);
    const c = fixture.componentInstance;

    c.remove(c.rows[1]);
    expect(c.removing?.ticketCount).toBe(4);
    expect(c.removing?.reassignTo).toBe(1);
    c.confirmReassign();
    const del = http.expectOne(r => r.method === 'DELETE' && r.url.endsWith('/settings/statuses/2'));
    expect(del.request.params.get('reassignTo')).toBe('1');
  });
});
