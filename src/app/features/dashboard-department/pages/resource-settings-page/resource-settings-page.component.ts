import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ResourceService } from '../../service/resource.service';
import { ResourceListItem } from '../../models/resource-list-item.model';
import { ResourceDetails } from '../../models/resource-details.model';
import { CreateResourceRequest } from '../../models/create-resource-request.model';
import { UpdateResourceRequest } from '../../models/update-resource-request.model';

@Component({
  selector: 'app-resource-settings-page',
  templateUrl: './resource-settings-page.component.html',
  styleUrls: ['./resource-settings-page.component.scss']
})
export class ResourceSettingsPageComponent implements OnInit {
  resources: ResourceListItem[] = [];
  selectedResource: ResourceDetails | null = null;

  departments: string[] = [];
  resourceTypes: string[] = [];
  seniorities: string[] = [];

  loading = false;
  saving = false;
  errorMessage = '';

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  search = '';
  selectedDepartmentCode = '';
  selectedRole = '';
  selectedActive: boolean | null = null;
  selectedInternalUser: boolean | null = null;

  createMode = false;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private resourceService: ResourceService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMeta();
    this.loadResources();
  }

  initForm(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: [''],
      password: [''],
      employeeCode: [''],
      departmentCode: [''],
      resourceType: [''],
      jobTitle: [''],
      role: ['EMPLOYEE'],
      seniority: [''],
      internalUser: [true],
      hoursPerDay: [8],
      daysPerWeek: [5],
      workdays: ['MON-FRI'],
      defaultRate: [null],
      rateType: [''],
      currency: [''],
      color: [''],
      notes: [''],
      active: [true]
    });
  }

  loadMeta(): void {
    this.resourceService.getDepartmentCodes().subscribe({
      next: data => this.departments = data ?? [],
      error: () => this.departments = []
    });

    this.resourceService.getResourceTypes().subscribe({
      next: data => this.resourceTypes = data ?? [],
      error: () => this.resourceTypes = []
    });

    this.resourceService.getSeniorities().subscribe({
      next: data => this.seniorities = data ?? [],
      error: () => this.seniorities = []
    });
  }

  loadResources(): void {
    this.loading = true;
    this.errorMessage = '';

    this.resourceService.getResources({
      search: this.search || undefined,
      departmentCode: this.selectedDepartmentCode || undefined,
      role: this.selectedRole || undefined,
      active: this.selectedActive,
      internalUser: this.selectedInternalUser,
      page: this.page,
      size: this.size,
      sort: 'fullName,asc'
    }).subscribe({
      next: response => {
        this.resources = response.content ?? [];
        this.totalElements = response.totalElements ?? 0;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Failed to load resources.';
        this.loading = false;
      }
    });
  }

  openCreate(): void {
    this.createMode = true;
    this.selectedResource = null;
    this.form.reset({
      fullName: '',
      email: '',
      password: '',
      employeeCode: '',
      departmentCode: '',
      resourceType: '',
      jobTitle: '',
      role: 'EMPLOYEE',
      seniority: '',
      internalUser: true,
      hoursPerDay: 8,
      daysPerWeek: 5,
      workdays: 'MON-FRI',
      defaultRate: null,
      rateType: '',
      currency: '',
      color: '',
      notes: '',
      active: true
    });

    this.form.get('email')?.setValidators([Validators.required, Validators.email]);
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('email')?.updateValueAndValidity();
    this.form.get('password')?.updateValueAndValidity();
  }

  openDetails(resourceId: number): void {
    this.createMode = false;
    this.loading = true;
    this.errorMessage = '';

    this.form.get('email')?.clearValidators();
    this.form.get('password')?.clearValidators();
    this.form.get('email')?.updateValueAndValidity();
    this.form.get('password')?.updateValueAndValidity();

    this.resourceService.getResourceById(resourceId).subscribe({
      next: resource => {
        this.selectedResource = resource;
        this.form.patchValue({
          fullName: resource.fullName,
          email: resource.email,
          password: '',
          employeeCode: resource.employeeCode,
          departmentCode: resource.departmentCode,
          resourceType: resource.resourceType,
          jobTitle: resource.jobTitle,
          role: resource.role,
          seniority: resource.seniority,
          internalUser: resource.internalUser,
          hoursPerDay: resource.hoursPerDay,
          daysPerWeek: resource.daysPerWeek,
          workdays: resource.workdays,
          defaultRate: resource.defaultRate,
          rateType: resource.rateType,
          currency: resource.currency,
          color: resource.color,
          notes: resource.notes,
          active: resource.active
        });
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Failed to load resource details.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    if (this.createMode) {
      const payload: CreateResourceRequest = {
        fullName: this.form.value.fullName,
        email: this.form.value.email,
        password: this.form.value.password,
        employeeCode: this.form.value.employeeCode,
        departmentCode: this.form.value.departmentCode,
        resourceType: this.form.value.resourceType,
        jobTitle: this.form.value.jobTitle,
        role: this.form.value.role,
        seniority: this.form.value.seniority,
        internalUser: this.form.value.internalUser,
        hoursPerDay: this.form.value.hoursPerDay,
        daysPerWeek: this.form.value.daysPerWeek,
        workdays: this.form.value.workdays,
        defaultRate: this.form.value.defaultRate,
        rateType: this.form.value.rateType,
        currency: this.form.value.currency,
        color: this.form.value.color,
        notes: this.form.value.notes,
        active: this.form.value.active
      };

      this.resourceService.createResource(payload).subscribe({
        next: resource => {
          this.saving = false;
          this.createMode = false;
          this.selectedResource = resource;
          this.loadResources();
          this.openDetails(resource.id);
        },
        error: err => {
          this.errorMessage = err?.error?.message || 'Failed to create resource.';
          this.saving = false;
        }
      });

      return;
    }

    if (!this.selectedResource) {
      this.errorMessage = 'No resource selected.';
      this.saving = false;
      return;
    }

    const payload: UpdateResourceRequest = {
      fullName: this.form.value.fullName,
      employeeCode: this.form.value.employeeCode,
      departmentCode: this.form.value.departmentCode,
      resourceType: this.form.value.resourceType,
      jobTitle: this.form.value.jobTitle,
      seniority: this.form.value.seniority,
      internalUser: this.form.value.internalUser,
      hoursPerDay: this.form.value.hoursPerDay,
      daysPerWeek: this.form.value.daysPerWeek,
      workdays: this.form.value.workdays,
      defaultRate: this.form.value.defaultRate,
      rateType: this.form.value.rateType,
      currency: this.form.value.currency,
      color: this.form.value.color,
      notes: this.form.value.notes,
      active: this.form.value.active
    };

    this.resourceService.updateResource(this.selectedResource.id, payload).subscribe({
      next: resource => {
        this.selectedResource = resource;
        this.saving = false;
        this.loadResources();
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Failed to update resource.';
        this.saving = false;
      }
    });
  }

  toggleStatus(resourceId: number, currentActive: boolean): void {
    const nextActive = !currentActive;

    this.resourceService.updateResourceStatus(resourceId, nextActive).subscribe({
      next: () => {
        if (this.selectedResource?.id === resourceId) {
          this.selectedResource.active = nextActive;
          this.form.patchValue({ active: nextActive });
        }

        const listItem = this.resources.find(r => r.id === resourceId);
        if (listItem) {
          listItem.active = nextActive;
        }

        this.loadResources();
      },
      error: err => {
        this.errorMessage = err?.error?.message || 'Failed to update status.';
      }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadResources();
  }

  resetFilters(): void {
    this.search = '';
    this.selectedDepartmentCode = '';
    this.selectedRole = '';
    this.selectedActive = null;
    this.selectedInternalUser = null;
    this.page = 0;
    this.loadResources();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    this.page = page;
    this.loadResources();
  }

  trackByResourceId(_: number, item: ResourceListItem): number {
    return item.id;
  }
}