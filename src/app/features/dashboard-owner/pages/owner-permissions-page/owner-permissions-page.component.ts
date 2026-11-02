import { Component, OnInit } from '@angular/core';
import { PlatformOrganisation } from '../../models/platform-organisation.model';
import { RolePermission } from '../../models/role-permission.model';
import { OwnerPermissionService } from '../../services/owner-permission.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-owner-permissions-page',
  templateUrl: './owner-permissions-page.component.html',
  styleUrls: ['./owner-permissions-page.component.scss']
})
export class OwnerPermissionsPageComponent implements OnInit {
  organisations: PlatformOrganisation[] = [];
  roles: string[] = [];

  selectedOrganisation?: PlatformOrganisation;
  selectedRole = '';

  permissions: RolePermission[] = [];

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private permissionService: OwnerPermissionService, private readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;

    this.permissionService.getOrganisations().subscribe({
      next: orgs => {
        this.organisations = orgs;

        if (orgs.length > 0) {
          this.selectedOrganisation = orgs[0];
        }

        this.permissionService.getRoles().subscribe({
          next: roles => {
            this.roles = roles;

            if (roles.length > 0) {
              this.selectedRole = roles[0];
            }

            this.loadPermissions();
          },
          error: () => {
            this.loading = false;
            this.errorMessage = this.i18n.t('owner.permissions.failedLoadRoles');
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = this.i18n.t('owner.permissions.failedLoadOrganisations');
      }
    });
  }

  selectOrganisation(org: PlatformOrganisation): void {
    this.selectedOrganisation = org;
    this.loadPermissions();
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.loadPermissions();
  }

  loadPermissions(): void {
    if (!this.selectedOrganisation || !this.selectedRole) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.permissionService
      .getPermissions(this.selectedOrganisation.id, this.selectedRole)
      .subscribe({
        next: data => {
          this.permissions = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = this.i18n.t('owner.permissions.failedLoadPermissions');
        }
      });
  }

  groupedPermissions(): { group: string; items: RolePermission[] }[] {
    const groups = new Map<string, RolePermission[]>();

    for (const permission of this.permissions) {
      if (!groups.has(permission.group)) {
        groups.set(permission.group, []);
      }

      groups.get(permission.group)!.push(permission);
    }

    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  }

  toggleRead(permission: RolePermission): void {
    permission.canRead = !permission.canRead;

    if (!permission.canRead) {
      permission.canWrite = false;
    }
  }

  toggleWrite(permission: RolePermission): void {
    permission.canWrite = !permission.canWrite;

    if (permission.canWrite) {
      permission.canRead = true;
    }
  }

  grantAll(): void {
    this.permissions = this.permissions.map(p => ({
      ...p,
      canRead: true,
      canWrite: true
    }));
  }

  revokeAll(): void {
    this.permissions = this.permissions.map(p => ({
      ...p,
      canRead: false,
      canWrite: false
    }));
  }

  save(): void {
    if (!this.selectedOrganisation || !this.selectedRole) return;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.permissionService
      .savePermissions(this.selectedOrganisation.id, this.selectedRole, this.permissions)
      .subscribe({
        next: data => {
          this.permissions = data;
          this.saving = false;
          this.successMessage = this.i18n.t('owner.permissions.permissionsSavedSuccessfully');
        },
        error: () => {
          this.saving = false;
          this.errorMessage = this.i18n.t('owner.permissions.failedSavePermissions');
        }
      });
  }

  accessLabel(permission: RolePermission): string {
    if (permission.canRead && permission.canWrite) return this.i18n.t('owner.permissions.access.full');
    if (permission.canRead) return this.i18n.t('owner.permissions.access.read');
    return this.i18n.t('owner.permissions.access.none');
  }

  roleLabel(role: string): string {
    const key = `roles.${role}`;
    const label = this.i18n.t(key);
    return label !== key ? label : role.replaceAll('_', ' ');
  }

  orgInitials(org: PlatformOrganisation): string {
    return org.code?.slice(0, 2).toUpperCase() || org.name.slice(0, 2).toUpperCase();
  }
}
