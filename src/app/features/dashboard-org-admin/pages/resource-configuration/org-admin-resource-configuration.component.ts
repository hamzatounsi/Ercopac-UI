import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Observable, Subject, catchError, concatMap, finalize, forkJoin, from, of, takeUntil, toArray } from 'rxjs';
import {
  CustomerConfig,
  OrganisationDepartment,
  OrganisationResourceType,
  ProjectCategoryConfig,
  ProjectTypeConfig,
  SaveCustomerConfig,
  SaveOrganisationResourceType,
  SaveProjectCategoryConfig,
  SaveProjectTypeConfig,
  SaveSupplierConfig,
  SupplierConfig
} from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

type ConfigurationTab = 'categories' | 'types' | 'resourceTypes' | 'customers' | 'suppliers';
type ConfigurationKind = 'category' | 'type' | 'customer' | 'supplier';
type DialogKind = ConfigurationKind | 'resourceType';

interface DeleteTarget {
  kind: ConfigurationKind;
  id: number;
  name: string;
  projectsUsing: number;
}

@Component({
  selector: 'app-org-admin-resource-configuration',
  templateUrl: './org-admin-resource-configuration.component.html',
  styleUrls: ['./org-admin-resource-configuration.component.scss']
})
export class OrgAdminResourceConfigurationComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  activeTab: ConfigurationTab = 'categories';
  categories: ProjectCategoryConfig[] = [];
  projectTypes: ProjectTypeConfig[] = [];
  customers: CustomerConfig[] = [];
  suppliers: SupplierConfig[] = [];
  departments: OrganisationDepartment[] = [];
  resourceTypes: OrganisationResourceType[] = [];
  search = '';
  loading = true;
  saving = false;
  deleting = false;
  importing = false;
  errorMessage = '';
  dialogKind: DialogKind | null = null;
  editingId: number | null = null;
  deleteTarget: DeleteTarget | null = null;
  supplierResourceTypeDropdownOpen = false;
  supplierResourceTypeSearch = '';

  readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,30}$/)]],
    description: ['', Validators.maxLength(500)],
    icon: ['category', Validators.maxLength(80)],
    color: ['#1565c0', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    active: [true]
  });

  readonly typeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,30}$/)]],
    description: ['', Validators.maxLength(500)],
    icon: ['description', Validators.maxLength(80)],
    color: ['#0f766e', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    billable: [false],
    active: [true]
  });

  readonly customerForm = this.formBuilder.nonNullable.group({
    customerCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,40}$/)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    country: ['', Validators.maxLength(80)],
    town: ['', Validators.maxLength(100)],
    address: ['', Validators.maxLength(250)],
    vatTaxId: ['', Validators.maxLength(80)],
    contactPerson: ['', Validators.maxLength(150)],
    email: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', Validators.maxLength(50)],
    erpId: ['', Validators.maxLength(80)],
    active: [true]
  });

  readonly resourceTypeForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,40}$/)]],
    label: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    departmentId: [null as number | null],
    colour: ['#2563eb', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
    defaultRate: [0, [Validators.min(0)]], 
    assignable: [true],
    active: [true]
  });

  readonly supplierForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{1,50}$/)]],
    contactPerson: ['', Validators.maxLength(150)],
    email: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', Validators.maxLength(50)],
    address: ['', Validators.maxLength(500)],
    notes: ['', Validators.maxLength(2000)],
    resourceTypeIds: [[] as number[]],
    active: [true]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly adminService: OrgAdminService,
    private readonly toast: AdminToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.supplierResourceTypeDropdownOpen = false;
    if (!this.saving && !this.deleting) {
      this.closeDialog();
      this.deleteTarget = null;
    }
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      categories: this.adminService.getCategories(),
      projectTypes: this.adminService.getProjectTypes(),
      customers: this.adminService.getCustomers(),
      departments: this.adminService.getDepartments(),
      resourceTypes: this.adminService.getResourceTypes(),
      suppliers: this.adminService.getSuppliers()
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading = false)
    ).subscribe({
      next: response => {
        this.categories = response.categories;
        this.projectTypes = response.projectTypes;
        this.customers = response.customers;
        this.departments = response.departments;
        this.resourceTypes = response.resourceTypes;
        this.suppliers = response.suppliers;
      },
      error: error => this.errorMessage = adminErrorMessage(error, 'Could not load resource configuration.')
    });
  }

  setTab(tab: ConfigurationTab): void {
    this.activeTab = tab;
    this.search = '';
  }

  get filteredCategories(): ProjectCategoryConfig[] {
    const query = this.normalizedSearch;
    return this.categories.filter(item => !query || `${item.code} ${item.name} ${item.description || ''}`.toLowerCase().includes(query));
  }

  get filteredProjectTypes(): ProjectTypeConfig[] {
    const query = this.normalizedSearch;
    return this.projectTypes.filter(item => !query || `${item.code} ${item.name} ${item.description || ''}`.toLowerCase().includes(query));
  }

  get filteredCustomers(): CustomerConfig[] {
    const query = this.normalizedSearch;
    return this.customers.filter(item => !query || [
      item.customerCode, item.name, item.country, item.town, item.contactPerson, item.email, item.erpId
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  get filteredResourceTypes(): OrganisationResourceType[] {
    const query = this.normalizedSearch;
    return this.resourceTypes.filter(item => !query || `${item.code} ${item.label || ''}`.toLowerCase().includes(query));
  }

  @HostListener('document:click', ['$event'])
  closeSupplierResourceTypeDropdownOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.supplier-resource-type-multiselect')) {
      this.supplierResourceTypeDropdownOpen = false;
    }
  }

  get filteredSuppliers(): SupplierConfig[] {
    const query = this.normalizedSearch;
    return this.suppliers.filter(item => !query || [
      item.code, item.name, item.contactPerson, item.email, item.phone,
      item.resourceTypes?.map(resourceType => resourceType.code).join(' ')
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  openSupplier(item?: SupplierConfig): void {
    this.dialogKind = 'supplier';
    this.editingId = item?.id ?? null;
    this.supplierForm.reset({
      name: item?.name ?? '', code: item?.code ?? '', contactPerson: item?.contactPerson ?? '',
      email: item?.email ?? '', phone: item?.phone ?? '', address: item?.address ?? '',
      notes: item?.notes ?? '', resourceTypeIds: item?.resourceTypes?.map(resourceType => resourceType.id) ?? [],
      active: item?.active ?? true
    });
    this.supplierResourceTypeDropdownOpen = false;
    this.supplierResourceTypeSearch = '';
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid || this.saving) { this.supplierForm.markAllAsTouched(); return; }
    const value = this.supplierForm.getRawValue();
    const payload: SaveSupplierConfig = {
      name: value.name.trim(), code: value.code.trim().toUpperCase(),
      contactPerson: this.optional(value.contactPerson),
      email: this.optional(value.email)?.toLowerCase() ?? null,
      phone: this.optional(value.phone), address: this.optional(value.address),
      notes: this.optional(value.notes), resourceTypeIds: value.resourceTypeIds, active: value.active
    };
    this.saveConfiguration(this.adminService.saveSupplier(this.editingId, payload), 'supplier');
  }

  supplierHasResourceType(resourceTypeId: number): boolean {
    return this.supplierForm.controls.resourceTypeIds.value.includes(resourceTypeId);
  }

  get filteredSupplierResourceTypes(): OrganisationResourceType[] {
    const query = this.supplierResourceTypeSearch.trim().toLowerCase();
    return this.resourceTypes.filter(resourceType => !query ||
      `${resourceType.code} ${resourceType.label || ''}`.toLowerCase().includes(query));
  }

  get selectedSupplierResourceTypes(): OrganisationResourceType[] {
    const selectedIds = this.supplierForm.controls.resourceTypeIds.value;
    return this.resourceTypes.filter(resourceType => selectedIds.includes(resourceType.id));
  }

  toggleSupplierResourceTypeDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.supplierResourceTypeDropdownOpen = !this.supplierResourceTypeDropdownOpen;
    if (!this.supplierResourceTypeDropdownOpen) this.supplierResourceTypeSearch = '';
  }

  setSupplierResourceTypeSearch(value: string): void {
    this.supplierResourceTypeSearch = value;
  }

  removeSupplierResourceType(resourceTypeId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.toggleSupplierResourceType(resourceTypeId, false);
  }

  toggleSupplierResourceType(resourceTypeId: number, checked: boolean): void {
    const current = this.supplierForm.controls.resourceTypeIds.value;
    this.supplierForm.controls.resourceTypeIds.setValue(
      checked ? [...new Set([...current, resourceTypeId])] : current.filter(id => id !== resourceTypeId)
    );
    this.supplierForm.controls.resourceTypeIds.markAsDirty();
  }

  openResourceType(item?: OrganisationResourceType): void {
  this.dialogKind = 'resourceType';
  this.editingId = item?.id ?? null;

  this.resourceTypeForm.enable({ emitEvent: false });

  this.resourceTypeForm.reset({
    code: item?.code ?? '',
    label: item?.label ?? '',
    departmentId: item?.departmentId ?? null,
    colour: item?.colour ?? '#2563eb',
    defaultRate: item?.defaultRate ?? 0, // ✅ AJOUTE CETTE LIGNE
    assignable: item?.assignable ?? true,
    active: item?.active ?? true
  });
}


  saveResourceType(): void {
    if (this.resourceTypeForm.invalid || this.saving) { this.resourceTypeForm.markAllAsTouched(); return; }
    const value = this.resourceTypeForm.getRawValue();
    const payload: SaveOrganisationResourceType = {
      code: value.code.trim().toUpperCase(), label: value.label.trim(), departmentId: value.departmentId,
      colour: this.optional(value.colour), defaultRate: value.defaultRate, assignable: value.assignable, active: value.active
    };
    this.saving = true;
    const request = this.editingId === null
      ? this.adminService.createResourceType(payload)
      : this.adminService.updateResourceType(this.editingId, payload);

    const editing = this.editingId !== null;
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: item => {
        this.resourceTypes = [...this.resourceTypes.filter(existing => existing.id !== item.id), item]
          .sort((left, right) => (left.label || left.code).localeCompare(right.label || right.code));
          this.dialogKind = null;
          this.editingId = null;
        this.toast.show(`Resource type ${editing ? 'updated' : 'created'}.`, 'success');
      },
      error: error => this.toast.show(adminErrorMessage(error, 'Could not save resource type.'), 'error')
    });
  }

  toggleResourceType(item: OrganisationResourceType): void {
    const payload: SaveOrganisationResourceType = {
      code: item.code, label: item.label, colour: item.colour, departmentId: item.departmentId,defaultRate: item.defaultRate ?? 0,
     assignable: item.assignable, active: !item.active
    };
    this.adminService.updateResourceType(item.id, payload).subscribe({
      next: updated => {
        this.resourceTypes = this.resourceTypes.map(existing => existing.id === updated.id ? updated : existing);
        this.toast.show(`Resource type ${updated.active ? 'activated' : 'deactivated'}.`, 'success');
      },
      error: error => this.toast.show(adminErrorMessage(error, 'Could not update resource type.'), 'error')
    });
  }

  openCategory(item?: ProjectCategoryConfig): void {
    this.dialogKind = 'category';
    this.editingId = item?.id ?? null;
    this.categoryForm.reset({
      name: item?.name ?? '', code: item?.code ?? '', description: item?.description ?? '',
      icon: item?.icon ?? 'category', color: item?.color ?? '#1565c0', active: item?.active ?? true
    });
  }

  openProjectType(item?: ProjectTypeConfig): void {
    this.dialogKind = 'type';
    this.editingId = item?.id ?? null;
    this.typeForm.reset({
      name: item?.name ?? '', code: item?.code ?? '', description: item?.description ?? '',
      icon: item?.icon ?? 'description', color: item?.color ?? '#0f766e',
      billable: item?.billable ?? false, active: item?.active ?? true
    });
  }

  openCustomer(item?: CustomerConfig): void {
    this.dialogKind = 'customer';
    this.editingId = item?.id ?? null;
    this.customerForm.reset({
      customerCode: item?.customerCode ?? '', name: item?.name ?? '', country: item?.country ?? '',
      town: item?.town ?? '', address: item?.address ?? '', vatTaxId: item?.vatTaxId ?? '',
      contactPerson: item?.contactPerson ?? '', email: item?.email ?? '', phone: item?.phone ?? '',
      erpId: item?.erpId ?? '', active: item?.active ?? true
    });
  }

  closeDialog(): void {
    if (this.saving) return;
    this.dialogKind = null;
    this.editingId = null;
  }

  saveCategory(): void {
    if (this.categoryForm.invalid || this.saving) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const value = this.categoryForm.getRawValue();
    const payload: SaveProjectCategoryConfig = {
      ...value,
      name: value.name.trim(),
      code: value.code.trim().toUpperCase(),
      description: this.optional(value.description),
      icon: this.optional(value.icon),
      color: this.optional(value.color)
    };
    this.saveConfiguration(this.adminService.saveCategory(this.editingId, payload), 'category');
  }

  saveProjectType(): void {
    if (this.typeForm.invalid || this.saving) {
      this.typeForm.markAllAsTouched();
      return;
    }
    const value = this.typeForm.getRawValue();
    const payload: SaveProjectTypeConfig = {
      ...value,
      name: value.name.trim(),
      code: value.code.trim().toUpperCase(),
      description: this.optional(value.description),
      icon: this.optional(value.icon),
      color: this.optional(value.color)
    };
    this.saveConfiguration(this.adminService.saveProjectType(this.editingId, payload), 'type');
  }

  saveCustomer(): void {
    if (this.customerForm.invalid || this.saving) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const value = this.customerForm.getRawValue();
    const payload: SaveCustomerConfig = {
      customerCode: value.customerCode.trim().toUpperCase(),
      name: value.name.trim(),
      country: this.optional(value.country), town: this.optional(value.town),
      address: this.optional(value.address), vatTaxId: this.optional(value.vatTaxId),
      contactPerson: this.optional(value.contactPerson), email: this.optional(value.email)?.toLowerCase() ?? null,
      phone: this.optional(value.phone), erpId: this.optional(value.erpId), active: value.active
    };
    this.saveConfiguration(this.adminService.saveCustomer(this.editingId, payload), 'customer');
  }

  requestDelete(kind: ConfigurationKind, item: ProjectCategoryConfig | ProjectTypeConfig | CustomerConfig | SupplierConfig): void {
    this.deleteTarget = {
      kind,
      id: item.id,
      name: item.name,
      projectsUsing: 'projectsUsing' in item ? item.projectsUsing : 0
    };
  }

  confirmDelete(): void {
    if (!this.deleteTarget || this.deleting) return;
    const target = this.deleteTarget;
    const request = target.kind === 'category'
      ? this.adminService.deleteCategory(target.id)
      : target.kind === 'type'
        ? this.adminService.deleteProjectType(target.id)
        : target.kind === 'customer'
          ? this.adminService.deleteCustomer(target.id)
          : this.adminService.deactivateSupplier(target.id);

    this.deleting = true;
    request.pipe(finalize(() => this.deleting = false)).subscribe({
      next: () => {
        if (target.kind === 'category') this.categories = this.categories.filter(item => item.id !== target.id);
        if (target.kind === 'type') this.projectTypes = this.projectTypes.filter(item => item.id !== target.id);
        if (target.kind === 'customer') this.customers = this.customers.filter(item => item.id !== target.id);
        if (target.kind === 'supplier') this.suppliers = this.suppliers.map(item => item.id === target.id ? { ...item, active: false } : item);
        this.deleteTarget = null;
        this.toast.show(`${this.kindLabel(target.kind)} ${target.kind === 'supplier' ? 'deactivated' : 'deleted'}.`, 'success');
      },
      error: error => this.toast.show(adminErrorMessage(error, `Could not delete ${this.kindLabel(target.kind).toLowerCase()}.`), 'error')
    });
  }

  importCustomers(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.importing) return;

    const reader = new FileReader();
    reader.onload = () => this.processCustomerCsv(String(reader.result || ''));
    reader.onerror = () => this.toast.show('Could not read the selected CSV file.', 'error');
    reader.readAsText(file);
  }

  private processCustomerCsv(text: string): void {
    const rows = this.parseCustomerCsv(text);
    if (!rows.length) {
      this.toast.show('No valid customer rows were found. Include customerCode and name columns.', 'info');
      return;
    }

    let failures = 0;
    this.importing = true;
    from(rows).pipe(
      concatMap(row => {
        const existing = this.customers.find(item => item.customerCode.toLowerCase() === row.customerCode.toLowerCase());
        return this.adminService.saveCustomer(existing?.id ?? null, row).pipe(
          catchError(() => { failures++; return of(null); })
        );
      }),
      toArray(),
      finalize(() => this.importing = false)
    ).subscribe(() => {
      const imported = rows.length - failures;
      if (imported) this.toast.show(`${imported} customer record(s) imported.`, 'success');
      if (failures) this.toast.show(`${failures} row(s) could not be imported. Review duplicates and validation.`, 'info');
      this.load();
    });
  }

  private parseCustomerCsv(text: string): SaveCustomerConfig[] {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = this.csvValues(lines[0])
      .map(value => value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    return lines.slice(1).map(line => {
      const values = this.csvValues(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
      return {
        customerCode: (row['customercode'] || row['customer_code'] || row['id'] || '').trim().toUpperCase(),
        name: (row['name'] || row['customer_name'] || '').trim(),
        country: this.optional(row['country']), town: this.optional(row['town'] || row['city']),
        address: this.optional(row['address']), vatTaxId: this.optional(row['vattaxid'] || row['vat_tax_id'] || row['vat']),
        contactPerson: this.optional(row['contactperson'] || row['contact_person'] || row['contact']),
        email: this.optional(row['email'])?.toLowerCase() ?? null, phone: this.optional(row['phone']),
        erpId: this.optional(row['erpid'] || row['erp_id']), active: true
      };
    }).filter(row => !!row.customerCode && !!row.name);
  }

  private csvValues(line: string): string[] {
    return line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
  }

  private saveConfiguration<T extends ProjectCategoryConfig | ProjectTypeConfig | CustomerConfig | SupplierConfig>(
    request: Observable<T>,
    kind: ConfigurationKind
  ): void {
    const editing = this.editingId !== null;
    this.saving = true;
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: item => {
        if (kind === 'category') this.categories = this.upsert(this.categories, item as ProjectCategoryConfig);
        if (kind === 'type') this.projectTypes = this.upsert(this.projectTypes, item as ProjectTypeConfig);
        if (kind === 'customer') this.customers = this.upsert(this.customers, item as CustomerConfig);
        if (kind === 'supplier') this.suppliers = this.upsert(this.suppliers, item as SupplierConfig);
        this.dialogKind = null;
        this.editingId = null;
        this.toast.show(`${this.kindLabel(kind)} ${editing ? 'updated' : 'created'}.`, 'success');
      },
      error: error => this.toast.show(adminErrorMessage(error, `Could not save ${this.kindLabel(kind).toLowerCase()}.`), 'error')
    });
  }

  private upsert<T extends { id: number; name: string }>(items: T[], item: T): T[] {
    return [...items.filter(existing => existing.id !== item.id), item]
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private kindLabel(kind: ConfigurationKind): string {
    return kind === 'category' ? 'Category' : kind === 'type' ? 'Project type' : kind === 'customer' ? 'Customer' : 'Supplier';
  }

  private optional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private get normalizedSearch(): string {
    return this.search.trim().toLowerCase();
  }
}
