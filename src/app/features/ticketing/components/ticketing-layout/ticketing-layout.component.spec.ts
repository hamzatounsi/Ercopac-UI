import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from 'src/app/core/auth/auth.service';

import { TicketingLayoutComponent } from './ticketing-layout.component';
import { translateTestingModule } from 'src/app/core/i18n/translate-testing';

describe('TicketingLayoutComponent', () => {
  function create(roles: string[]): ComponentFixture<TicketingLayoutComponent> {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, translateTestingModule()],
      declarations: [TicketingLayoutComponent],
      providers: [{
        provide: AuthService,
        useValue: {
          hasAnyRole: (r: readonly string[]) => r.some(x => roles.includes(x)),
          getRoles: () => roles, getCurrentUsername: () => 'Test User', getOrganisationName: () => 'Org'
        }
      }],
      schemas: [NO_ERRORS_SCHEMA]
    });
    const fixture = TestBed.createComponent(TicketingLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the dashboard and team settings to support leads', () => {
    const c = create(['H24_LEAD']).componentInstance;
    expect(c.navItems.map(i => i.label)).toEqual(['ticketing.layout.tickets', 'ticketing.layout.liveChat', 'ticketing.layout.dashboard', 'ticketing.layout.settings']);
    expect(c.navItems[3].route).toBe('/tickets/settings/h24-agents');
  });

  it('gives clients their own tickets and language settings only', () => {
    const c = create(['CLIENT']).componentInstance;
    expect(c.navItems.map(i => i.label)).toEqual(['ticketing.layout.myTickets', 'ticketing.layout.liveChat', 'ticketing.layout.settings']);
    expect(c.navItems[2].route).toBe('/tickets/settings/language');
  });
});
