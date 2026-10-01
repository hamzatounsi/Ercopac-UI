import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatRoutingSettingsComponent } from './chat-routing-settings.component';

describe('ChatRoutingSettingsComponent', () => {
  let component: ChatRoutingSettingsComponent;
  let fixture: ComponentFixture<ChatRoutingSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatRoutingSettingsComponent]
    });
    fixture = TestBed.createComponent(ChatRoutingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
