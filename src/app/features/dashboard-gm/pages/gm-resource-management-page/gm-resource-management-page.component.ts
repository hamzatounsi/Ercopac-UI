import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

import { GmResourceService } from '../../services/gm-resource.service';
import { GmSupplierService } from '../../services/gm-supplier.service';
import { ResourceDetails } from '../../models/resource-details.model';
import { ResourceListItem } from '../../models/resource-list-item.model';
import { Supplier } from '../../models/supplier.model';
import { CreateResourceRequest } from '../../models/create-resource-request.model';
import { UpdateResourceRequest } from '../../models/update-resource-request.model';

type PageTab = 'resources' | 'suppliers';
type SortDirection = 'asc' | 'desc';
type ResourceSortColumn =
  | 'id'
  | 'fullName'
  | 'employeeCode'
  | 'departmentCode'
  | 'resourceType'
  | 'jobTitle'
  | 'seniority'
  | 'defaultRate'
  | 'email'
  | 'internalUser';

@Component({
  selector: 'app-gm-resource-management-page',
  templateUrl: './gm-resource-management-page.component.html',
  styleUrls: ['./gm-resource-management-page.component.scss']
})
export class GmResourceManagementPageComponent implements OnInit {
  activeTab: PageTab = 'resources';

  loading = false;
  saving = false;
  error: string | null = null;

  resources: ResourceListItem[] = [];
  filteredResources: ResourceListItem[] = [];
  totalResources = 0;

  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];

  departmentOptions: string[] = [];
  resourceTypeOptions: string[] = [];
  seniorityOptions: string[] = [];

  selectedDepartment = '';
  selectedSeniority = '';
  selectedInternal = '';
  resourceSearchTerm = '';

  supplierSearchTerm = '';
  supplierDepartmentFilter = '';

  selectedResourceId: number | null = null;
  selectedResource: ResourceDetails | null = null;
  resourceDrawerOpen = false;

  selectedSupplierId: number | null = null;
  selectedSupplier: Supplier | null = null;
  supplierDrawerOpen = false;

  resourceSortColumn: ResourceSortColumn = 'id';
  resourceSortDirection: SortDirection = 'asc';

  readonly roleOptions = ['DEPARTMENT_MANAGER', 'GENERAL_MANAGER', 'EMPLOYEE'];

  readonly internalOptions = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Internal' },
    { value: 'false', label: 'External' }
  ];

  readonly currencyOptions = ['EUR', 'USD', 'GBP', 'CHF'];
  readonly rateTypeOptions = ['daily', 'hourly', 'fixed'];

  resourceCreateForm: CreateResourceRequest = this.createEmptyCreateResourceForm();
  resourceUpdateForm: UpdateResourceRequest = this.createEmptyUpdateResourceForm();
  supplierForm: Partial<Supplier> = this.createEmptySupplierForm();

  constructor(
    private gmResourceService: GmResourceService,
    private gmSupplierService: GmSupplierService
  ) {}

  ngOnInit(): void {
    this.loadMeta();
    this.loadResources();
    this.loadSuppliers();
  }

  setTab(tab: PageTab): void {
    this.activeTab = tab;
  }

  get departmentCounts(): Record<string, number> {
    const counts: Record<string, number> = { ALL: this.resources.length };

    for (const resource of this.resources) {
      const key = resource.departmentCode || 'other';
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }

  loadMeta(): void {
    this.gmResourceService.getDepartmentCodes().subscribe({
      next: data => this.departmentOptions = data ?? [],
      error: () => {}
    });

    this.gmResourceService.getResourceTypes().subscribe({
      next: data => this.resourceTypeOptions = data ?? [],
      error: () => {}
    });

    this.gmResourceService.getSeniorities().subscribe({
      next: data => this.seniorityOptions = data ?? [],
      error: () => {}
    });
  }

  loadResources(): void {
    this.loading = true;
    this.error = null;

    const internalUser =
      this.selectedInternal === ''
        ? undefined
        : this.selectedInternal === 'true';

    this.gmResourceService.getResources({
      search: this.resourceSearchTerm || undefined,
      departmentCode: this.selectedDepartment || undefined,
      active: true,
      internalUser,
      page: 0,
      size: 300
    }).subscribe({
      next: (page) => {
        this.resources = page.content ?? [];
        this.totalResources = page.totalElements ?? this.resources.length;
        this.applyResourceFiltersLocalSort();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load resources.';
        this.loading = false;
      }
    });
  }

  loadSuppliers(): void {
    this.gmSupplierService.getSuppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers ?? [];
        this.applySupplierFilters();
      },
      error: () => {}
    });
  }

  applyResourceFilters(): void {
    this.loadResources();
  }

  applyResourceFiltersLocalSort(): void {
    let rows = [...this.resources];

    if (this.selectedSeniority) {
      rows = rows.filter(r => (r.seniority || '') === this.selectedSeniority);
    }

    rows.sort((a, b) => this.compareResourceRows(a, b));
    this.filteredResources = rows;
  }

  applySupplierFilters(): void {
    const term = this.supplierSearchTerm.trim().toLowerCase();
    let rows = [...this.suppliers];

    if (this.supplierDepartmentFilter) {
      rows = rows.filter(s => (s.departments || []).includes(this.supplierDepartmentFilter));
    }

    if (term) {
      rows = rows.filter(s =>
        (s.name || '').toLowerCase().includes(term) ||
        (s.shortCode || '').toLowerCase().includes(term) ||
        (s.contact || '').toLowerCase().includes(term) ||
        (s.country || '').toLowerCase().includes(term)
      );
    }

    this.filteredSuppliers = rows;
  }

  setResourceSort(column: ResourceSortColumn): void {
    if (this.resourceSortColumn === column) {
      this.resourceSortDirection = this.resourceSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.resourceSortColumn = column;
      this.resourceSortDirection = 'asc';
    }

    this.applyResourceFiltersLocalSort();
  }

  openNewResource(): void {
    this.selectedResourceId = null;
    this.selectedResource = null;
    this.resourceCreateForm = this.createEmptyCreateResourceForm();
    this.resourceDrawerOpen = true;
  }

  openResource(resourceId: number): void {
    this.selectedResourceId = resourceId;
    this.error = null;

    this.gmResourceService.getResourceById(resourceId).subscribe({
      next: (resource) => {
        this.selectedResource = resource;
        this.resourceUpdateForm = {
          fullName: resource.fullName || '',
          employeeCode: resource.employeeCode || '',
          departmentCode: resource.departmentCode || '',
          resourceType: resource.resourceType || '',
          jobTitle: resource.jobTitle || '',
          seniority: resource.seniority || '',
          internalUser: resource.internalUser ?? true,
          hoursPerDay: resource.hoursPerDay ?? 8,
          daysPerWeek: resource.daysPerWeek ?? 5,
          workdays: resource.workdays || 'MON-FRI',
          defaultRate: resource.defaultRate ?? 0,
          rateType: resource.rateType || 'daily',
          currency: resource.currency || 'EUR',
          color: resource.color || '',
          notes: resource.notes || '',
          active: resource.active ?? true
        };
        this.resourceDrawerOpen = true;
      },
      error: () => {
        this.error = 'Failed to load resource details.';
      }
    });
  }

  closeResourceDrawer(): void {
    this.resourceDrawerOpen = false;
    this.selectedResourceId = null;
    this.selectedResource = null;
    this.resourceCreateForm = this.createEmptyCreateResourceForm();
    this.resourceUpdateForm = this.createEmptyUpdateResourceForm();
  }

  saveResource(): void {
    this.error = null;
    this.saving = true;

    const request$ = this.selectedResourceId
      ? this.gmResourceService.updateResource(this.selectedResourceId, this.resourceUpdateForm)
      : this.gmResourceService.createResource(this.resourceCreateForm);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.closeResourceDrawer();
        this.loadResources();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Failed to save resource.';
      }
    });
  }

  deactivateResource(resourceId: number): void {
    this.gmResourceService.updateResourceStatus(resourceId, false).subscribe({
      next: () => {
        if (this.selectedResourceId === resourceId) {
          this.closeResourceDrawer();
        }
        this.loadResources();
      },
      error: () => {
        this.error = 'Failed to deactivate resource.';
      }
    });
  }

  exportResourcesExcel(): void {
    const rows = this.filteredResources.map(r => ({
      fullName: r.fullName,
      email: r.email,
      employeeCode: r.employeeCode,
      departmentCode: r.departmentCode,
      resourceType: r.resourceType,
      jobTitle: r.jobTitle,
      seniority: r.seniority,
      internalUser: r.internalUser,
      defaultRate: r.defaultRate,
      rateType: r.rateType,
      currency: r.currency
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resources');
    XLSX.writeFile(workbook, 'resources.xlsx');
  }

  importResourcesExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      this.createResourcesFromImportRows(rows, 'Failed to import resources.');
    };

    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  exportResourcesJson(): void {
    const data = JSON.stringify(this.filteredResources, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'resources.json';
    a.click();

    window.URL.revokeObjectURL(url);
  }

  importResourcesJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const rows = JSON.parse(reader.result as string) as any[];
        this.createResourcesFromImportRows(rows, 'Failed to import JSON resources.');
      } catch {
        this.error = 'Invalid JSON file.';
      }
    };

    reader.readAsText(file);
    input.value = '';
  }

  private createResourcesFromImportRows(rows: any[], errorMessage: string): void {
    const requests = rows
      .filter(row => row)
      .map(row => this.gmResourceService.createResource({
        fullName: row.fullName || row.FullName || row.name || row.Name || 'New Resource',
        email: row.email || row.Email || '',
        password: row.password || row.Password || 'Resource123!',
        role: row.role || row.Role || 'EMPLOYEE',
        employeeCode: row.employeeCode || row.EmployeeCode || row.code || row.Code || '',
        departmentCode: row.departmentCode || row.DepartmentCode || row.department || row.Department || '',
        resourceType: row.resourceType || row.ResourceType || '',
        jobTitle: row.jobTitle || row.JobTitle || row.roleTitle || '',
        seniority: row.seniority || row.Seniority || '',
        internalUser: this.parseBoolean(row.internalUser ?? row.InternalUser ?? true),
        hoursPerDay: Number(row.hoursPerDay || row.HoursPerDay || 8),
        daysPerWeek: Number(row.daysPerWeek || row.DaysPerWeek || 5),
        workdays: row.workdays || row.Workdays || 'MON-FRI',
        defaultRate: Number(row.defaultRate || row.DefaultRate || row.rate || row.Rate || 0),
        rateType: row.rateType || row.RateType || 'daily',
        currency: row.currency || row.Currency || 'EUR',
        color: row.color || row.Color || '',
        notes: row.notes || row.Notes || '',
        active: true
      }));

    if (!requests.length) {
      this.error = 'No rows found to import.';
      return;
    }

    this.saving = true;

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.loadResources();
      },
      error: () => {
        this.saving = false;
        this.error = errorMessage;
      }
    });
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', 'yes', '1', 'internal'].includes(value.toLowerCase());
    }
    return Boolean(value);
  }

  openNewSupplier(): void {
    this.selectedSupplierId = null;
    this.selectedSupplier = null;
    this.supplierForm = this.createEmptySupplierForm();
    this.supplierDrawerOpen = true;
  }

  openSupplier(supplier: Supplier): void {
    this.selectedSupplierId = supplier.id ?? null;
    this.selectedSupplier = supplier;
    this.supplierForm = {
      name: supplier.name || '',
      shortCode: supplier.shortCode || '',
      country: supplier.country || '',
      contact: supplier.contact || '',
      website: supplier.website || '',
      departments: [...(supplier.departments || [])],
      resourceTypes: [...(supplier.resourceTypes || [])],
      notes: supplier.notes || ''
    };
    this.supplierDrawerOpen = true;
  }

  closeSupplierDrawer(): void {
    this.supplierDrawerOpen = false;
    this.selectedSupplierId = null;
    this.selectedSupplier = null;
    this.supplierForm = this.createEmptySupplierForm();
  }

  saveSupplier(): void {
    this.saving = true;

    const request$ = this.selectedSupplierId
      ? this.gmSupplierService.updateSupplier(this.selectedSupplierId, this.supplierForm)
      : this.gmSupplierService.createSupplier(this.supplierForm);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.closeSupplierDrawer();
        this.loadSuppliers();
      },
      error: () => {
        this.saving = false;
        this.error = 'Supplier backend is not implemented yet.';
      }
    });
  }

  deleteSupplier(id: number): void {
    this.gmSupplierService.deleteSupplier(id).subscribe({
      next: () => this.loadSuppliers(),
      error: () => {
        this.error = 'Supplier backend is not implemented yet.';
      }
    });
  }

  toggleSupplierDepartment(department: string): void {
    const current = new Set(this.supplierForm.departments || []);
    current.has(department) ? current.delete(department) : current.add(department);
    this.supplierForm.departments = [...current];
  }

  toggleSupplierResourceType(resourceType: string): void {
    const current = new Set(this.supplierForm.resourceTypes || []);
    current.has(resourceType) ? current.delete(resourceType) : current.add(resourceType);
    this.supplierForm.resourceTypes = [...current];
  }

  isSupplierDepartmentSelected(department: string): boolean {
    return (this.supplierForm.departments || []).includes(department);
  }

  isSupplierResourceTypeSelected(resourceType: string): boolean {
    return (this.supplierForm.resourceTypes || []).includes(resourceType);
  }

  private compareResourceRows(a: ResourceListItem, b: ResourceListItem): number {
    const av = this.getResourceSortValue(a, this.resourceSortColumn);
    const bv = this.getResourceSortValue(b, this.resourceSortColumn);

    let result = 0;
    if (typeof av === 'number' && typeof bv === 'number') {
      result = av - bv;
    } else {
      result = String(av).localeCompare(String(bv));
    }

    return this.resourceSortDirection === 'asc' ? result : -result;
  }

  private getResourceSortValue(row: ResourceListItem, column: ResourceSortColumn): string | number {
    switch (column) {
      case 'id':
        return row.id ?? 0;
      case 'defaultRate':
        return row.defaultRate ?? 0;
      case 'internalUser':
        return row.internalUser ? 1 : 0;
      default:
        return (row[column] as string) ?? '';
    }
  }

  private createEmptyCreateResourceForm(): CreateResourceRequest {
    return {
      fullName: 'New Resource',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      employeeCode: '',
      departmentCode: '',
      resourceType: '',
      jobTitle: '',
      seniority: '',
      internalUser: true,
      hoursPerDay: 8,
      daysPerWeek: 5,
      workdays: 'MON-FRI',
      defaultRate: 50,
      rateType: 'daily',
      currency: 'EUR',
      color: '',
      notes: '',
      active: true
    };
  }

  private createEmptyUpdateResourceForm(): UpdateResourceRequest {
    return {
      fullName: '',
      employeeCode: '',
      departmentCode: '',
      resourceType: '',
      jobTitle: '',
      seniority: '',
      internalUser: true,
      hoursPerDay: 8,
      daysPerWeek: 5,
      workdays: 'MON-FRI',
      defaultRate: 0,
      rateType: 'daily',
      currency: 'EUR',
      color: '',
      notes: '',
      active: true
    };
  }

  private createEmptySupplierForm(): Partial<Supplier> {
    return {
      name: '',
      shortCode: '',
      country: '',
      contact: '',
      website: '',
      departments: [],
      resourceTypes: [],
      notes: ''
    };
  }
}