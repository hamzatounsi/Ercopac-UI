import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusesSettingsComponent } from './statuses-settings.component';

describe('StatusesSettingsComponent', () => {
  let component: StatusesSettingsComponent;
  let fixture: ComponentFixture<StatusesSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StatusesSettingsComponent]
    });
    fixture = TestBed.createComponent(StatusesSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
