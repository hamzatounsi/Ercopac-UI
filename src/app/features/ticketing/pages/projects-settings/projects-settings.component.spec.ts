import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsSettingsComponent } from './projects-settings.component';

describe('ProjectsSettingsComponent', () => {
  let component: ProjectsSettingsComponent;
  let fixture: ComponentFixture<ProjectsSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProjectsSettingsComponent]
    });
    fixture = TestBed.createComponent(ProjectsSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
