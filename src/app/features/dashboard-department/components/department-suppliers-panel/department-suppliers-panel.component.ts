import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { toUpperName } from 'src/app/core/names';
import { COUNTRIES } from 'src/app/core/customers/countries';
import { AdminToastService } from 'src/app/features/dashboard-org-admin/shared/admin-toast.service';
import { DepartmentContext } from '../../models/department-context.model';
import { DepartmentSupplier, SaveSupplierRequest } from '../../models/department-supplier.model';
import { MyDepartmentService } from '../../service/my-department.service';
import { ClientTable } from '../../utils/client-table';
import { initialsOf } from '../../utils/department-dates';

type SupplierSortKey = 'name' | 'types' | 'country' | 'contact' | 'assignments';
type DrawerMode = 'view' | 'create' | 'edit';

/**
 * Suppliers tab of My Department: suppliers linked to the department's resource types.
 * Department Managers only see and change suppliers of their resource types (enforced by the API);
 * actions are hidden when the user lacks the Suppliers write permission or the supplier is not editable.
 */
@Component({
  selector: 'app-department-suppliers-panel',
  templateUrl: './department-suppliers-panel.component.html',
  styleUrls: ['./department-suppliers-panel.component.scss']
})
export class DepartmentSuppliersPanelComponent implements OnChanges {
  @Input() suppliers: DepartmentSupplier[] = [];
  @Input() context: DepartmentContext | null = null;
  @Input() loading = false;
  @Input() error = '';
  /** Open activities per supplier id, from the department timeline. */
  @Input() assignmentCounts: Record<number, number> = {};
  @Output() changed = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  readonly countries = COUNTRIES;
  readonly table = new ClientTable<DepartmentSupplier, SupplierSortKey>({
    initialSort: 'name',
    searchText: supplier => [supplier.name, supplier.shortCode, supplier.country, supplier.contact, supplier.website,
      supplier.notes, ...supplier.resourceTypes].filter(Boolean).join(' '),
    sortValue: {
      name: supplier => supplier.name,
      types: supplier => supplier.departmentResourceTypes.join(', '),
      country: supplier => supplier.country,
      contact: supplier => supplier.contact,
      assignments: supplier => this.assignmentCounts[supplier.id] ?? 0
    }
  });

  typeFilter = '';
  drawerMode: DrawerMode | null = null;
  current: DepartmentSupplier | null = null;
  saving = false;
  submitted = false;
  formError = '';
  pendingDelete: DepartmentSupplier | null = null;
  deleting = false;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    shortCode: ['', Validators.maxLength(50)],
    country: [''],
    contact: ['', Validators.maxLength(150)],
    website: ['', Validators.maxLength(255)],
    resourceTypes: [[] as string[]],
    notes: ['', Validators.maxLength(2000)]
  });

  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmCancel') private confirmCancel?: ElementRef<HTMLButtonElement>;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: MyDepartmentService,
    private readonly toast: AdminToastService,
    private readonly i18n: I18nService
  ) {}

  ngOnChanges(): void {
    this.table.setRows(this.suppliers ?? []);
  }

  get canManage(): boolean {
    return !!this.context?.canManageSuppliers;
  }

  /** Resource types of the department, offered when creating or editing a supplier. */
  get departmentTypes(): string[] {
    return (this.context?.resourceTypes ?? []).map(type => type.code);
  }

  get canCreate(): boolean {
    return this.canManage && this.departmentTypes.length > 0;
  }

  /** Resource types of the supplier owned by other departments: shown, kept, not editable here. */
  get lockedTypes(): string[] {
    const own = new Set(this.departmentTypes);
    return (this.current?.resourceTypes ?? []).filter(code => !own.has(code));
  }

  get selectedTypes(): string[] {
    return this.form.value.resourceTypes ?? [];
  }

  get typesInvalid(): boolean {
    return this.submitted && this.selectedTypes.length === 0;
  }

  onSearch(value: string): void {
    this.table.setSearch(value);
  }

  onTypeFilter(value: string): void {
    this.typeFilter = value;
    this.table.setFilter('type', value ? supplier => supplier.resourceTypes.includes(value) : null);
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.table.clearFilters();
  }

  assignments(supplier: DepartmentSupplier): number {
    return this.assignmentCounts[supplier.id] ?? 0;
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  // ------------------------------------------------------------ drawer

  openView(supplier: DepartmentSupplier): void {
    this.openDrawer('view', supplier);
  }

  openCreate(): void {
    if (!this.canCreate) {
      return;
    }
    this.form.reset({
      name: '', shortCode: '', country: '', contact: '', website: '', notes: '',
      resourceTypes: this.departmentTypes.length === 1 ? [...this.departmentTypes] : []
    });
    this.openDrawer('create', null);
  }

  openEdit(supplier: DepartmentSupplier): void {
    if (!this.canManage || !supplier.editable) {
      return;
    }
    const own = new Set(this.departmentTypes);
    this.form.reset({
      name: supplier.name ?? '',
      shortCode: supplier.shortCode ?? '',
      country: supplier.country ?? '',
      contact: supplier.contact ?? '',
      website: supplier.website ?? '',
      notes: supplier.notes ?? '',
      resourceTypes: supplier.resourceTypes.filter(code => own.has(code))
    });
    this.openDrawer('edit', supplier);
  }

  closeDrawer(): void {
    if (!this.drawerMode || this.saving) {
      return;
    }
    this.drawerMode = null;
    this.current = null;
    this.restoreFocus();
  }

  toggleType(code: string, checked: boolean): void {
    const next = new Set(this.selectedTypes);
    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }
    this.form.patchValue({ resourceTypes: this.departmentTypes.filter(type => next.has(type)) });
  }

  isInvalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.selectedTypes.length === 0 || !this.context) {
      return;
    }

    const value = this.form.getRawValue();
    const editing = this.drawerMode === 'edit' && this.current;
    const departments = new Set(this.current?.departments ?? []);
    departments.add(this.context.departmentCode);

    const request: SaveSupplierRequest = {
      name: toUpperName(value.name),
      shortCode: this.clean(value.shortCode),
      country: this.clean(value.country),
      contact: this.clean(value.contact),
      website: this.clean(value.website),
      departments: [...departments],
      // Types owned by other departments are always sent back so they are never removed from here.
      resourceTypes: [...this.selectedTypes, ...this.lockedTypes],
      notes: this.clean(value.notes)
    };

    this.saving = true;
    const call = editing && this.current
      ? this.service.updateSupplier(this.current.id, request)
      : this.service.createSupplier(request);

    call.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toast.show(this.i18n.t(editing ? 'department.workspace.suppliers.toast.updated' : 'department.workspace.suppliers.toast.created',
          { name: request.name }), 'success');
        this.drawerMode = null;
        this.current = null;
        this.restoreFocus();
        this.changed.emit();
      },
      error: err => {
        this.formError = this.i18n.error(err, 'department.workspace.suppliers.saveError');
      }
    });
  }

  // ------------------------------------------------------------ delete

  requestDelete(supplier: DepartmentSupplier): void {
    if (!this.canManage || !supplier.editable) {
      return;
    }
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.pendingDelete = supplier;
    setTimeout(() => this.confirmCancel?.nativeElement.focus());
  }

  cancelDelete(): void {
    if (this.deleting) {
      return;
    }
    this.pendingDelete = null;
    this.restoreFocus();
  }

  confirmDelete(): void {
    const supplier = this.pendingDelete;
    if (!supplier) {
      return;
    }
    this.deleting = true;
    this.service.deleteSupplier(supplier.id)
      .pipe(finalize(() => (this.deleting = false)))
      .subscribe({
        next: () => {
          this.toast.show(this.i18n.t('department.workspace.suppliers.toast.deleted', { name: supplier.name }), 'success');
          this.pendingDelete = null;
          this.returnFocus = null;
          this.changed.emit();
        },
        error: err => {
          this.pendingDelete = null;
          this.toast.show(this.i18n.error(err, 'department.workspace.suppliers.deleteError'), 'error');
          this.restoreFocus();
        }
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingDelete) {
      this.cancelDelete();
    } else {
      this.closeDrawer();
    }
  }

  trackById(_: number, supplier: DepartmentSupplier): number {
    return supplier.id;
  }

  private openDrawer(mode: DrawerMode, supplier: DepartmentSupplier | null): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.drawerMode = mode;
    this.current = supplier;
    this.submitted = false;
    this.formError = '';
    setTimeout(() => this.drawerClose?.nativeElement.focus());
  }

  private restoreFocus(): void {
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  private clean(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : null;
  }
}
