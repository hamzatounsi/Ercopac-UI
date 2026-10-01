import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagersSettingsComponent } from './managers-settings.component';

describe('ManagersSettingsComponent', () => {
  let component: ManagersSettingsComponent;
  let fixture: ComponentFixture<ManagersSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ManagersSettingsComponent]
    });
    fixture = TestBed.createComponent(ManagersSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
