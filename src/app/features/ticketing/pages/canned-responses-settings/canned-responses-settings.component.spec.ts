import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CannedResponsesSettingsComponent } from './canned-responses-settings.component';

describe('CannedResponsesSettingsComponent', () => {
  let component: CannedResponsesSettingsComponent;
  let fixture: ComponentFixture<CannedResponsesSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CannedResponsesSettingsComponent]
    });
    fixture = TestBed.createComponent(CannedResponsesSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
