import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentCatalogueSettingsComponent } from './equipment-catalogue-settings.component';

describe('EquipmentCatalogueSettingsComponent', () => {
  let component: EquipmentCatalogueSettingsComponent;
  let fixture: ComponentFixture<EquipmentCatalogueSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EquipmentCatalogueSettingsComponent]
    });
    fixture = TestBed.createComponent(EquipmentCatalogueSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
