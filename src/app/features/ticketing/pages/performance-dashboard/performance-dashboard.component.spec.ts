import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { PerformanceDashboardComponent } from './performance-dashboard.component';

describe('PerformanceDashboardComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [PerformanceDashboardComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('requests the analytics with the chosen filters', () => {
    const fixture = TestBed.createComponent(PerformanceDashboardComponent);
    fixture.detectChanges();
    const first = http.expectOne(r => r.url.endsWith('/tickets/analytics'));
    expect(first.request.params.has('from')).toBeTrue();
    expect(first.request.params.has('customerId')).toBeFalse();

    const c = fixture.componentInstance;
    c.customerId = 7;
    c.serial = ' SN-1 ';
    c.load();
    const second = http.expectOne(r => r.url.endsWith('/tickets/analytics') && r.params.get('customerId') === '7');
    expect(second.request.params.get('serial')).toBe('SN-1');
  });

  it('formats durations and SLA classes', () => {
    const c = TestBed.createComponent(PerformanceDashboardComponent).componentInstance;
    expect(c.hours(0.5)).toBe('30 min');
    expect(c.hours(5)).toBe('5.0 h');
    expect(c.hours(72)).toBe('3.0 d');
    expect(c.slaClass(97)).toBe('good');
    expect(c.slaClass(80)).toBe('bad');
    expect(c.slaClass(null)).toBe('none');
  });
});
