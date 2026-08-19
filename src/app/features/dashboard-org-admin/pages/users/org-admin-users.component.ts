import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  OrganisationDepartment,
  OrganisationRole,
  OrganisationRoleSummary,
  OrganisationResourceType,
  OrganisationUser,
  SaveOrganisationUser
} from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({ selector: 'app-org-admin-users', templateUrl: './org-admin-users.component.html', styleUrls: ['./org-admin-users.component.scss'] })
export class OrgAdminUsersComponent implements OnInit, OnDestroy {
  users: OrganisationUser[] = [];
  departments: OrganisationDepartment[] = [];
  resourceTypes: OrganisationResourceType[] = [];
  roles: OrganisationRoleSummary[] = [];
  loading = true;
  loadingUsers = false;
  saving = false;
  errorMessage = '';
  formError = '';
  drawerOpen = false;
  editingUser: OrganisationUser | null = null;
  pendingStatusUser: OrganisationUser | null = null;
  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;
  sort = 'fullName';
  direction: 'asc' | 'desc' = 'asc';
  readonly currentUserId: number | null;
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly filterForm = this.fb.group({
    role: this.fb.nonNullable.control(''),
    departmentId: this.fb.control<number | null>(null),
    status: this.fb.nonNullable.control('')
  });
  readonly userForm = this.fb.group({
    fullName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(180)]),
    password: this.fb.nonNullable.control(''),
    role: this.fb.nonNullable.control<OrganisationRole>('EMPLOYEE', Validators.required),
    departmentId: this.fb.control<number | null>(null),
    resourceTypeId: this.fb.control<number | null>(null),
    employeeCode: this.fb.nonNullable.control('', Validators.maxLength(40)),
    jobTitle: this.fb.nonNullable.control('', Validators.maxLength(80)),
    active: this.fb.nonNullable.control(true)
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: OrgAdminService,
    private readonly toast: AdminToastService,
    authService: AuthService
  ) { this.currentUserId = authService.getCurrentUserId(); }

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => { this.page = 0; this.loadUsers(); });
    this.filterForm.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(() => { this.page = 0; this.loadUsers(); });
    this.userForm.controls.role.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateResourceProfileValidators());
    this.loadMetadata();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingStatusUser) this.pendingStatusUser = null;
    else if (this.drawerOpen && !this.saving) this.closeDrawer();
  }

  loadMetadata(): void {
    this.loading = true; this.errorMessage = '';
    forkJoin({ departments: this.service.getDepartments(), resourceTypes: this.service.getResourceTypes(), roles: this.service.getRoles() })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: result => { this.departments = result.departments; this.resourceTypes = result.resourceTypes; this.roles = result.roles; this.loadUsers(); },
        error: error => this.errorMessage = adminErrorMessage(error, 'Could not load user administration data.')
      });
  }

  loadUsers(): void {
    if (this.loadingUsers) return;
    const filters = this.filterForm.getRawValue();
    this.loadingUsers = true; this.errorMessage = '';
    this.service.getUsers({
      search: this.searchControl.value,
      role: filters.role || undefined,
      departmentId: filters.departmentId,
      active: filters.status === '' ? null : filters.status === 'active',
      page: this.page, size: this.size, sort: this.sort, direction: this.direction
    }).pipe(finalize(() => this.loadingUsers = false)).subscribe({
      next: response => { this.users = response.content; this.page = response.page; this.totalElements = response.totalElements; this.totalPages = response.totalPages; },
      error: error => this.errorMessage = adminErrorMessage(error, 'Could not load organisation users.')
    });
  }

  openCreate(): void {
    this.editingUser = null; this.formError = ''; this.drawerOpen = true;
    this.userForm.reset({ fullName: '', email: '', password: '', role: 'EMPLOYEE', departmentId: null, resourceTypeId: null, employeeCode: '', jobTitle: '', active: true });
    this.updateResourceProfileValidators();
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.userForm.controls.password.updateValueAndValidity();
  }

  openEdit(user: OrganisationUser): void {
    this.editingUser = user; this.formError = ''; this.drawerOpen = true;
    this.userForm.reset({ fullName: user.fullName, email: user.email, password: '', role: user.role, departmentId: user.departmentId, resourceTypeId: user.resourceTypeId, employeeCode: user.employeeCode || '', jobTitle: user.jobTitle || '', active: user.active });
    this.updateResourceProfileValidators();
    this.userForm.controls.password.clearValidators(); this.userForm.controls.password.updateValueAndValidity();
  }

  closeDrawer(): void { if (!this.saving) { this.drawerOpen = false; this.editingUser = null; this.formError = ''; } }

  saveUser(): void {
    if (this.userForm.invalid || this.saving) { this.userForm.markAllAsTouched(); return; }
    const value = this.userForm.getRawValue();
    const payload: SaveOrganisationUser = {
      fullName: value.fullName.trim(), email: value.email.trim(), role: value.role,
      departmentId: value.departmentId, resourceTypeId: value.resourceTypeId, employeeCode: value.employeeCode.trim() || null,
      jobTitle: value.jobTitle.trim() || null, active: value.active
    };
    this.saving = true; this.formError = '';
    const request = this.editingUser
      ? this.service.updateUser(this.editingUser.id, payload)
      : this.service.createUser({ ...payload, password: value.password });
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toast.show(this.editingUser ? 'User account updated.' : 'User account created.');
        this.drawerOpen = false;
        this.editingUser = null;
        this.loadUsers();
      },
      error: error => this.formError = adminErrorMessage(error, 'Could not save the user account.')
    });
  }

  requestStatusChange(user: OrganisationUser): void { this.pendingStatusUser = user; }
  confirmStatusChange(): void {
    const user = this.pendingStatusUser; if (!user || this.saving) return;
    this.saving = true;
    this.service.updateUserStatus(user.id, !user.active).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.toast.show(user.active ? 'User account deactivated.' : 'User account activated.'); this.pendingStatusUser = null; this.loadUsers(); },
      error: error => { this.pendingStatusUser = null; this.toast.show(adminErrorMessage(error, 'Could not update the account status.'), 'error'); }
    });
  }

  setSort(sort: string): void { if (this.sort === sort) this.direction = this.direction === 'asc' ? 'desc' : 'asc'; else { this.sort = sort; this.direction = 'asc'; } this.page = 0; this.loadUsers(); }
  previousPage(): void { if (this.page > 0) { this.page--; this.loadUsers(); } }
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadUsers(); } }
  trackUser(_index: number, user: OrganisationUser): number { return user.id; }
  roleLabel(role: OrganisationRole): string { return this.roles.find(item => item.role === role)?.label || role.replace(/_/g, ' '); }
  requiresResourceProfile(role: OrganisationRole): boolean {
    return ['PROJECT_MANAGER', 'PROJECT_MANAGER_LEAD', 'DEPARTMENT_MANAGER', 'EMPLOYEE', 'SALES_MANAGER'].includes(role);
  }
  private updateResourceProfileValidators(): void {
    const required = this.requiresResourceProfile(this.userForm.controls.role.value);
    const controls = [this.userForm.controls.departmentId, this.userForm.controls.resourceTypeId];
    controls.forEach(control => {
      control.setValidators(required ? [Validators.required] : []);
      if (!required) control.setValue(null, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    });
  }
}
