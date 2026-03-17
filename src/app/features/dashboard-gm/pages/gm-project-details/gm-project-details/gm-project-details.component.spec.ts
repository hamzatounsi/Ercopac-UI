import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmProjectDetailsComponent } from './gm-project-details.component';

describe('GmProjectDetailsComponent', () => {
  let component: GmProjectDetailsComponent;
  let fixture: ComponentFixture<GmProjectDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GmProjectDetailsComponent]
    });
    fixture = TestBed.createComponent(GmProjectDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
