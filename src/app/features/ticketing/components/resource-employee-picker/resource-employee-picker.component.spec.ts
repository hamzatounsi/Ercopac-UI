import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { TicketSettingsService } from '../../services/ticket-settings.service';

import { ResourceEmployeePickerComponent } from './resource-employee-picker.component';

describe('ResourceEmployeePickerComponent', () => {
  let component: ResourceEmployeePickerComponent;
  let settings: jasmine.SpyObj<TicketSettingsService>;

  beforeEach(() => {
    settings = jasmine.createSpyObj('TicketSettingsService', ['resourceTypes', 'employees']);
    settings.resourceTypes.and.returnValue(of([{ id: 3, code: 'PLC', label: 'PLC Engineer' }, { id: 4, code: 'ROB', label: 'Robotics' }]));
    settings.employees.and.callFake((typeId: number) => of(typeId === 3
      ? [{ id: 20, fullName: 'Nora', email: 'n@x.test', resourceTypeId: 3, l2Technician: true }]
      : [{ id: 30, fullName: 'Rob', email: 'r@x.test', resourceTypeId: 4, l2Technician: true }]));
    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [ResourceEmployeePickerComponent],
      providers: [{ provide: TicketSettingsService, useValue: settings }]
    });
    component = TestBed.createComponent(ResourceEmployeePickerComponent).componentInstance;
    component.l2Only = true;
    component.ngOnInit();
  });

  it('keeps the employee list disabled until a resource type is chosen', () => {
    expect(component.typeId).toBeNull();
    expect(component.employeeHint).toBe('Choose a resource type first');
    expect(settings.employees).not.toHaveBeenCalled();
  });

  it('asks the backend for the employees of the chosen type and resets the choice when the type changes', () => {
    component.onType(3);
    expect(settings.employees).toHaveBeenCalledWith(3, true);
    component.onEmployee(20);
    expect(component.selectedId).toBe(20);

    component.onType(4);
    expect(component.selectedId).toBeNull();
    expect(component.employees.map(e => e.id)).toEqual([30]);
  });

  it('preselects both dropdowns for an existing assignment', () => {
    component.resourceTypeId = 3;
    component.employeeId = 20;
    component.ngOnChanges({ resourceTypeId: new SimpleChange(null, 3, true), employeeId: new SimpleChange(null, 20, true) });

    expect(component.typeId).toBe(3);
    expect(component.selectedId).toBe(20);
    expect(component.missing).toBeFalse();
  });

  it('emits the picked employee', () => {
    const picked: number[] = [];
    component.picked.subscribe(e => picked.push(e.id));
    component.onType(3);
    component.onEmployee(20);
    expect(picked).toEqual([20]);
  });
});
