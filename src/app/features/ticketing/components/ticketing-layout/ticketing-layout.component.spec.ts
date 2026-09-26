import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketingLayoutComponent } from './ticketing-layout.component';

describe('TicketingLayoutComponent', () => {
  let component: TicketingLayoutComponent;
  let fixture: ComponentFixture<TicketingLayoutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TicketingLayoutComponent]
    });
    fixture = TestBed.createComponent(TicketingLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
