import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CustomerService } from 'src/app/core/customers/customer.service';
import { CustomerOption } from 'src/app/core/customers/customer.models';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { OrganisationUser, SaveCustomerUser } from '../../models/org-admin.models';
import { OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

/**
 * Customer users: accounts of the organisation's customers. They sign in to the Ticketing app only,
 * always with the CLIENT role and exactly one customer. Same table and drawer as the Users page,
 * without the role, department, resource type and employee code fields.
 */
@Component({
  selector: 'app-org-admin-customer-users',
  templateUrl: './org-admin-customer-users.component.html',
  styleUrls: ['../users/org-admin-users.component.scss', './org-admin-customer-users.component.scss']
})
export class OrgAdminCustomerUsersComponent implements OnInit, OnDestroy {
  users: OrganisationUser[] = [];
  customers: CustomerOption[] = [];
  loadingUsers = false;
  saving = false;
  showPassword = false;
  errorMessage = '';
  formError = '';
  drawerOpen = false;
  editingUser: OrganisationUser | null = null;
  pendingStatusUser: OrganisationUser | null = null;
  pendingDeleteUser: OrganisationUser | null = null;
  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;
  sort = 'fullName';
  direction: 'asc' | 'desc' = 'asc';

  // Quick "new customer" dialog opened from the Customer field
  customerDialogOpen = false;
  savingCustomer = false;
  customerError = '';

  readonly currentUserId: number | null;
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly filterForm = this.fb.group({
    customerId: this.fb.control<number | null>(null),
    status: this.fb.nonNullable.control('active')
  });
  readonly userForm = this.fb.group({
    fullName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(180)]),
    password: this.fb.nonNullable.control(''),
    customerId: this.fb.control<number | null>(null, Validators.required),
    jobTitle: this.fb.nonNullable.control('', Validators.maxLength(80)),
    active: this.fb.nonNullable.control(true)
  });
  readonly customerForm = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    email: this.fb.nonNullable.control('', [Validators.email, Validators.maxLength(180)]),
    phone: this.fb.nonNullable.control('', Validators.maxLength(50)),
    address: this.fb.nonNullable.control('', Validators.maxLength(250))
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: OrgAdminService,
    private readonly customerService: CustomerService,
    private readonly toast: AdminToastService,
    authService: AuthService,
    private readonly i18n: I18nService
  ) { this.currentUserId = authService.getCurrentUserId(); }

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => { this.page = 0; this.loadUsers(); });
    this.filterForm.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(() => { this.page = 0; this.loadUsers(); });
    this.loadCustomers();
    this.loadUsers();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.customerDialogOpen && !this.savingCustomer) this.customerDialogOpen = false;
    else if (this.pendingStatusUser) this.pendingStatusUser = null;
    else if (this.pendingDeleteUser) this.pendingDeleteUser = null;
    else if (this.drawerOpen && !this.saving) this.closeDrawer();
  }

  /** Active customers for the list filter. */
  loadCustomers(): void {
    this.customerService.options().pipe(takeUntil(this.destroy$)).subscribe({
      next: options => this.customers = options,
      error: () => this.customers = []
    });
  }

  loadUsers(): void {
    if (this.loadingUsers) return;
    const filters = this.filterForm.getRawValue();
    this.loadingUsers = true; this.errorMessage = '';
    this.service.getCustomerUsers({
      search: this.searchControl.value,
      customerId: filters.customerId,
      active: filters.status === '' ? null : filters.status === 'active',
      page: this.page, size: this.size, sort: this.sort, direction: this.direction
    }).pipe(finalize(() => this.loadingUsers = false)).subscribe({
      next: response => { this.users = response.content; this.page = response.page; this.totalElements = response.totalElements; this.totalPages = response.totalPages; },
      error: error => this.errorMessage = this.i18n.error(error, 'orgAdmin.customerUsers.loadUsers')
    });
  }

  openCreate(): void {
    this.editingUser = null; this.formError = ''; this.drawerOpen = true; this.showPassword = false;
    this.userForm.reset({ fullName: '', email: '', password: '', customerId: this.filterForm.controls.customerId.value, jobTitle: '', active: true });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(128)]);
    this.userForm.controls.password.updateValueAndValidity();
  }

  openEdit(user: OrganisationUser): void {
    this.editingUser = user; this.formError = ''; this.drawerOpen = true; this.showPassword = false;
    this.userForm.reset({ fullName: user.fullName, email: user.email, password: '', customerId: user.customerId ?? null, jobTitle: user.jobTitle || '', active: user.active });
    this.userForm.controls.password.setValidators([Validators.minLength(8), Validators.maxLength(128)]);
    this.userForm.controls.password.updateValueAndValidity();
  }

  closeDrawer(): void { if (!this.saving) { this.drawerOpen = false; this.editingUser = null; this.formError = ''; } }

  saveUser(): void {
    if (this.userForm.invalid || this.saving) { this.userForm.markAllAsTouched(); return; }
    const value = this.userForm.getRawValue();
    const payload: SaveCustomerUser = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      jobTitle: value.jobTitle.trim() || null,
      customerId: value.customerId as number,
      active: value.active,
      password: value.password
    };
    this.saving = true; this.formError = '';
    const request = this.editingUser
      ? this.service.updateCustomerUser(this.editingUser.id, payload)
      : this.service.createCustomerUser({ ...payload, password: value.password });
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toast.show(this.editingUser ? this.i18n.t('orgAdmin.customerUsers.updated') : this.i18n.t('orgAdmin.customerUsers.created'));
        this.drawerOpen = false; this.editingUser = null; this.showPassword = false;
        this.loadUsers();
      },
      error: error => this.formError = this.i18n.error(error, 'orgAdmin.customerUsers.saveUser')
    });
  }

  // ---------- quick customer creation ----------

  openCustomerDialog(): void {
    this.customerError = '';
    this.customerForm.reset({ name: '', email: '', phone: '', address: '' });
    this.customerDialogOpen = true;
  }

  saveCustomer(): void {
    if (this.customerForm.invalid || this.savingCustomer) { this.customerForm.markAllAsTouched(); return; }
    const value = this.customerForm.getRawValue();
    this.savingCustomer = true; this.customerError = '';
    this.customerService.create({
      customerCode: null,
      name: value.name.trim(),
      country: null,
      town: null,
      address: value.address.trim() || null,
      vatTaxId: null,
      contactPerson: null,
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
      erpId: null,
      active: true
    }).pipe(finalize(() => this.savingCustomer = false)).subscribe({
      next: customer => {
        this.customerDialogOpen = false;
        this.userForm.controls.customerId.setValue(customer.id);
        this.userForm.controls.customerId.markAsTouched();
        this.loadCustomers();
        this.toast.show(this.i18n.t('orgAdmin.customerUsers.customerCreated'));
      },
      error: error => this.customerError = this.i18n.error(error, 'orgAdmin.customerUsers.saveCustomer')
    });
  }

  // ---------- status and delete ----------

  requestStatusChange(user: OrganisationUser): void { this.pendingStatusUser = user; }
  confirmStatusChange(): void {
    const user = this.pendingStatusUser; if (!user || this.saving) return;
    this.saving = true;
    this.service.updateCustomerUserStatus(user.id, !user.active).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.toast.show(user.active ? this.i18n.t('orgAdmin.users.userAccountDeactivated') : this.i18n.t('orgAdmin.users.userAccountActivated')); this.pendingStatusUser = null; this.loadUsers(); },
      error: error => { this.pendingStatusUser = null; this.toast.show(this.i18n.error(error, 'orgAdmin.users.updateAccountStatus'), 'error'); }
    });
  }

  requestDelete(user: OrganisationUser): void { this.pendingDeleteUser = user; }
  confirmDelete(): void {
    const user = this.pendingDeleteUser; if (!user || this.saving) return;
    this.saving = true;
    this.service.deleteCustomerUser(user.id).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.toast.show(this.i18n.t('orgAdmin.users.userAccountDeactivatedSuccessfully')); this.pendingDeleteUser = null; this.loadUsers(); },
      error: error => { this.pendingDeleteUser = null; this.toast.show(this.i18n.error(error, 'orgAdmin.users.deleteUserAccount'), 'error'); }
    });
  }

  setSort(sort: string): void { if (this.sort === sort) this.direction = this.direction === 'asc' ? 'desc' : 'asc'; else { this.sort = sort; this.direction = 'asc'; } this.page = 0; this.loadUsers(); }
  previousPage(): void { if (this.page > 0) { this.page--; this.loadUsers(); } }
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadUsers(); } }
  trackUser(_index: number, user: OrganisationUser): number { return user.id; }
  roleLabel(role: string): string {
    const key = `roles.${role}`;
    const label = this.i18n.t(key);
    return label !== key ? label : role.replace(/_/g, ' ');
  }
}
