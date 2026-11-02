import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { OrganisationRoleSummary } from '../../models/org-admin.models';
import { OrgAdminService } from '../../services/org-admin.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({ selector: 'app-org-admin-roles', templateUrl: './org-admin-roles.component.html', styleUrls: ['./org-admin-roles.component.scss'] })
export class OrgAdminRolesComponent implements OnInit {
  roles: OrganisationRoleSummary[] = [];
  loading = true;
  errorMessage = '';
  constructor(private readonly service: OrgAdminService, private readonly i18n: I18nService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.errorMessage = ''; this.service.getRoles().pipe(finalize(() => this.loading = false)).subscribe({ next: roles => this.roles = roles, error: error => this.errorMessage = this.i18n.error(error, 'orgAdmin.roles.loadRolesPermissions') }); }
}
