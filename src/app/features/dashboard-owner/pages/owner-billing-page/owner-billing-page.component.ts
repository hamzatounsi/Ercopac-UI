import { Component, OnInit } from '@angular/core';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';
import { PlatformOrganisation } from '../../models/platform-organisation.model';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({ selector: 'app-owner-billing-page', templateUrl: './owner-billing-page.component.html', styleUrls: ['./owner-billing-page.component.scss'] })
export class OwnerBillingPageComponent implements OnInit {
  organisations: PlatformOrganisation[] = [];
  selected?: PlatformOrganisation;
  usage: Array<{ role: string; allocated: number; used: number; available: number }> = [];
  loading = true;
  saving = false;
  message = '';
  readonly seatRoles = [
    { key: 'orgAdminLicenceLimit', label: 'roles.ORG_ADMIN' },
    { key: 'projectManagerLicenceLimit', label: 'roles.PROJECT_MANAGER' },
    { key: 'departmentManagerLicenceLimit', label: 'roles.DEPARTMENT_MANAGER' },
    { key: 'employeeLicenceLimit', label: 'roles.EMPLOYEE' },
    { key: 'salesManagerLicenceLimit', label: 'roles.SALES_MANAGER' },
    { key: 'clientLicenceLimit', label: 'roles.CLIENT' }
  ] as const;

  constructor(private readonly service: OwnerDashboardService, private readonly i18n: I18nService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.loading = true; this.service.getPlatformOrganisations().subscribe({ next: organisations => { this.organisations = organisations; this.selected = organisations[0]; this.loading = false; if (this.selected) this.loadUsage(this.selected.id); }, error: () => { this.message = this.i18n.t('owner.billing.couldNotLoadPlans'); this.loading = false; } }); }
  select(organisation: PlatformOrganisation): void { this.selected = organisation; this.message = ''; this.loadUsage(organisation.id); }
  loadUsage(id: number): void { this.service.getPlatformLicenceUsage(id).subscribe({ next: usage => this.usage = usage || [], error: () => this.usage = [] }); }
  usageFor(key: string): { allocated: number; used: number; available: number } { return this.usage.find(item => item.role === key) || { allocated: 0, used: 0, available: 0 }; }
  seats(): number { return this.selected ? this.seatRoles.reduce((total, role) => total + this.selected![role.key], 0) : 0; }
  save(): void {
    if (!this.selected) return;
    this.saving = true; this.message = '';
    const organisation = this.selected;
    this.service.updatePlatformOrganisation(organisation.id, {
      organisationName: organisation.name, organisationCode: organisation.code, country: organisation.country, domain: organisation.domain,
      status: organisation.status, plan: organisation.plan, userLimit: organisation.userLimit,
      orgAdminLicenceLimit: organisation.orgAdminLicenceLimit, projectManagerLicenceLimit: organisation.projectManagerLicenceLimit,
      departmentManagerLicenceLimit: organisation.departmentManagerLicenceLimit, employeeLicenceLimit: organisation.employeeLicenceLimit,
      salesManagerLicenceLimit: organisation.salesManagerLicenceLimit, clientLicenceLimit: organisation.clientLicenceLimit,
      monthlyRevenue: organisation.monthlyRevenue, healthScore: organisation.healthScore, billingEmail: organisation.billingEmail,
      vatNumber: organisation.vatNumber, paymentMethod: organisation.paymentMethod, force2faAdmins: organisation.force2faAdmins,
      force2faSpecialists: organisation.force2faSpecialists, force2faOperators: organisation.force2faOperators,
      default2faMethod: organisation.default2faMethod, sessionTimeout: organisation.sessionTimeout,
      maxFailedLogins: organisation.maxFailedLogins, passwordMinLength: organisation.passwordMinLength,
      passwordExpiry: organisation.passwordExpiry, internalNotes: organisation.internalNotes,
      flagAtRisk: organisation.flagAtRisk, flagPaymentOverdue: organisation.flagPaymentOverdue,
      flagUpsellOpportunity: organisation.flagUpsellOpportunity, flagVipPriority: organisation.flagVipPriority,
      flagPilotFeatures: organisation.flagPilotFeatures, flagUnderReview: organisation.flagUnderReview,
      adminFullName: organisation.adminFullName
    }).subscribe({ next: updated => { const index = this.organisations.findIndex(item => item.id === updated.id); if (index >= 0) this.organisations[index] = updated; this.selected = updated; this.loadUsage(updated.id); this.saving = false; this.message = this.i18n.t('owner.billing.allocationSaved'); }, error: error => { this.saving = false; this.message = this.i18n.error(error, 'owner.billing.couldNotSaveAllocation'); } });
  }
}
