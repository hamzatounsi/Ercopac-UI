import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { EmployeeOption, ResourceTypeOption } from '../../models/ticket.models';
import { TicketSettingsService } from '../../services/ticket-settings.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

// Cascading choice of a Projectum employee: Resource type first, then the employees of that type
// (filtered by the backend). The employee list stays disabled until a type is chosen and is cleared
// when the type changes. resourceTypeId + employeeId preselect an existing assignment.
@Component({
  selector: 'app-resource-employee-picker',
  templateUrl: './resource-employee-picker.component.html',
  styleUrls: ['./resource-employee-picker.component.scss']
})
export class ResourceEmployeePickerComponent implements OnInit, OnChanges, OnDestroy {
  /** Only employees flagged as L2 technicians. */
  @Input() l2Only = false;
  @Input() resourceTypeId: number | null = null;
  @Input() employeeId: number | null = null;
  /** Name shown when the preselected employee is not in the list (e.g. no longer flagged). */
  @Input() employeeName?: string;
  @Input() excludeIds: number[] = [];
  @Input() disabled = false;
  @Input() compact = false;
  @Input() employeePlaceholder = 'ticketing.picker.chooseEmployee';
  @Input() emptyText = 'ticketing.picker.noEmployeeOfType';
  @Output() picked = new EventEmitter<EmployeeOption>();

  types: ResourceTypeOption[] = [];
  employees: EmployeeOption[] = [];
  typeId: number | null = null;
  selectedId: number | null = null;
  loadingTypes = true;
  loadingEmployees = false;
  typesError = '';
  employeesError = '';
  private employeesSub?: Subscription;

  constructor(private i18n: I18nService,
    private settings: TicketSettingsService) {}

  ngOnInit(): void { this.loadTypes(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId']) this.selectedId = this.employeeId;
    if (changes['resourceTypeId'] && this.resourceTypeId !== this.typeId) {
      this.typeId = this.resourceTypeId;
      this.loadEmployees();
    }
  }

  ngOnDestroy(): void { this.employeesSub?.unsubscribe(); }

  get available(): EmployeeOption[] { return this.employees.filter(e => !this.excludeIds.includes(e.id) || e.id === this.selectedId); }

  /** The preselected employee stays visible when the list does not contain it. */
  get missing(): boolean { return this.selectedId != null && !this.loadingEmployees && !this.employees.some(e => e.id === this.selectedId); }

  get employeeHint(): string {
    if (!this.typeId) return this.i18n.t('ticketing.picker.chooseResourceTypeFirst');
    if (this.loadingEmployees) return this.i18n.t('ticketing.picker.loadingEmployees');
    if (this.employeesError) return this.i18n.t('ticketing.picker.employeesUnavailable');
    return this.available.length ? this.employeePlaceholder : this.emptyText;
  }

  onType(id: number | null): void {
    this.typeId = id;
    this.selectedId = null;
    this.loadEmployees();
  }

  onEmployee(id: number | null): void {
    this.selectedId = id;
    const employee = this.employees.find(e => e.id === id);
    if (employee) this.picked.emit(employee);
  }

  retry(): void {
    if (this.typesError) this.loadTypes();
    else this.loadEmployees();
  }

  private loadTypes(): void {
    this.loadingTypes = true;
    this.typesError = '';
    this.settings.resourceTypes().subscribe({
      next: t => { this.types = t; this.loadingTypes = false; },
      error: e => { this.loadingTypes = false; this.typesError = this.i18n.error(e, 'ticketing.picker.resourceTypesCouldNot'); }
    });
  }

  private loadEmployees(): void {
    this.employeesSub?.unsubscribe();
    this.employees = [];
    this.employeesError = '';
    if (!this.typeId) { this.loadingEmployees = false; return; }
    this.loadingEmployees = true;
    this.employeesSub = this.settings.employees(this.typeId, this.l2Only).subscribe({
      next: e => { this.employees = e; this.loadingEmployees = false; },
      error: e => { this.loadingEmployees = false; this.employeesError = this.i18n.error(e, 'ticketing.picker.employeesCouldNotLoaded'); }
    });
  }
}
