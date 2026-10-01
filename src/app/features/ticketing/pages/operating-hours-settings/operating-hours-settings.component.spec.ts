import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatingHoursSettingsComponent } from './operating-hours-settings.component';

describe('OperatingHoursSettingsComponent', () => {
  let component: OperatingHoursSettingsComponent;
  let fixture: ComponentFixture<OperatingHoursSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OperatingHoursSettingsComponent]
    });
    fixture = TestBed.createComponent(OperatingHoursSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
