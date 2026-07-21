import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { OrganisationDepartment, OrganisationUser, SaveOrganisationDepartment } from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({ selector: 'app-org-admin-departments', templateUrl: './org-admin-departments.component.html', styleUrls: ['./org-admin-departments.component.scss'] })
export class OrgAdminDepartmentsComponent implements OnInit {
  departments: OrganisationDepartment[] = [];
  managers: OrganisationUser[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  formError = '';
  dialogOpen = false;
  editingDepartment: OrganisationDepartment | null = null;
  pendingDelete: OrganisationDepartment | null = null;
  readonly form = this.fb.group({
    code: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_-]+$/)]),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    managerId: this.fb.control<number | null>(null)
  });

  constructor(private readonly fb: FormBuilder, private readonly service: OrgAdminService, private readonly toast: AdminToastService) {}
  ngOnInit(): void { this.load(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.pendingDelete) this.pendingDelete = null; else if (this.dialogOpen && !this.saving) this.closeDialog(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    forkJoin({ departments: this.service.getDepartments(), managers: this.service.getUsers({ role: 'DEPARTMENT_MANAGER', active: true, size: 100, sort: 'fullName' }) })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: result => { this.departments = result.departments; this.managers = result.managers.content; },
        error: error => this.errorMessage = adminErrorMessage(error, 'Could not load organisation departments.')
      });
  }

  openCreate(): void { this.editingDepartment = null; this.formError = ''; this.form.reset({ code: '', name: '', managerId: null }); this.dialogOpen = true; }
  openEdit(department: OrganisationDepartment): void { this.editingDepartment = department; this.formError = ''; this.form.reset({ code: department.code, name: department.name, managerId: department.managerId }); this.dialogOpen = true; }
  closeDialog(): void { if (!this.saving) { this.dialogOpen = false; this.editingDepartment = null; } }

  save(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const payload: SaveOrganisationDepartment = { code: value.code.trim().toUpperCase(), name: value.name.trim(), managerId: value.managerId };
    const editing = !!this.editingDepartment;
    this.saving = true; this.formError = '';
    const request = this.editingDepartment ? this.service.updateDepartment(this.editingDepartment.id, payload) : this.service.createDepartment(payload);
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.dialogOpen = false; this.editingDepartment = null; this.toast.show(editing ? 'Department updated.' : 'Department created.'); this.load(); },
      error: error => this.formError = adminErrorMessage(error, 'Could not save the department.')
    });
  }

  deleteDepartment(): void {
    const department = this.pendingDelete; if (!department || this.saving) return;
    this.saving = true;
    this.service.deleteDepartment(department.id).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.pendingDelete = null; this.toast.show('Department deleted.'); this.load(); },
      error: error => { this.pendingDelete = null; this.toast.show(adminErrorMessage(error, 'Could not delete the department.'), 'error'); }
    });
  }
}
