import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { OrganisationRoleSummary } from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';

@Component({ selector: 'app-org-admin-roles', templateUrl: './org-admin-roles.component.html', styleUrls: ['./org-admin-roles.component.scss'] })
export class OrgAdminRolesComponent implements OnInit {
  roles: OrganisationRoleSummary[] = [];
  loading = true;
  errorMessage = '';
  constructor(private readonly service: OrgAdminService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.errorMessage = ''; this.service.getRoles().pipe(finalize(() => this.loading = false)).subscribe({ next: roles => this.roles = roles, error: error => this.errorMessage = adminErrorMessage(error, 'Could not load roles and permissions.') }); }
}
