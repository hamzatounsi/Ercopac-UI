import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrioritiesSettingsComponent } from './priorities-settings.component';

describe('PrioritiesSettingsComponent', () => {
  let component: PrioritiesSettingsComponent;
  let fixture: ComponentFixture<PrioritiesSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrioritiesSettingsComponent]
    });
    fixture = TestBed.createComponent(PrioritiesSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
