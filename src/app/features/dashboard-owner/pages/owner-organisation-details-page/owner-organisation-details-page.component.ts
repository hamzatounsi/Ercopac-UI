import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';
import { PlatformOrganisation } from '../../models/platform-organisation.model';

type OrgStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

@Component({
  selector: 'app-owner-organisation-details-page',
  templateUrl: './owner-organisation-details-page.component.html',
  styleUrls: ['./owner-organisation-details-page.component.scss']
})
export class OwnerOrganisationDetailsPageComponent implements OnInit {
  organisation?: PlatformOrganisation;
  loading = true;
  saving = false;
  errorMessage = '';

  licenceTotal = 0;

  selectedSection:
    | 'general'
    | 'billing'
    | 'licences'
    | 'security'
    | 'notes' = 'general';

  setSection(section: 'general' | 'billing' | 'licences' | 'security' | 'notes'): void {
    this.selectedSection = section;
  }

  billingEmail = 'billing@company.com';
  vatNumber = '';
  paymentMethod = 'SEPA Direct Debit';

  internalNotes = '';

  flagAtRisk = false;
  flagPaymentOverdue = false;
  flagUpsell = false;
  flagVip = false;
  flagPilot = false;
  flagUnderReview = false;

  get totalLicences(): number {
    if (!this.organisation) return 0;

    return this.organisation.orgAdminLicenceLimit +
      this.organisation.generalManagerLicenceLimit +
      this.organisation.departmentManagerLicenceLimit +
      this.organisation.employeeLicenceLimit;
  }

  changeLicence(
    type: 'orgAdmin' | 'generalManager' | 'departmentManager' | 'employee',
    delta: number
  ): void {
    if (!this.organisation) return;

    if (type === 'orgAdmin') {
      this.organisation.orgAdminLicenceLimit = Math.max(0, this.organisation.orgAdminLicenceLimit + delta);
    }

    if (type === 'generalManager') {
      this.organisation.generalManagerLicenceLimit = Math.max(0, this.organisation.generalManagerLicenceLimit + delta);
    }

    if (type === 'departmentManager') {
      this.organisation.departmentManagerLicenceLimit = Math.max(0, this.organisation.departmentManagerLicenceLimit + delta);
    }

    if (type === 'employee') {
      this.organisation.employeeLicenceLimit = Math.max(0, this.organisation.employeeLicenceLimit + delta);
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: OwnerDashboardService
  ) {}

  ngOnInit(): void {
    this.loadOrganisation();
  }

  loadOrganisation(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.loading = true;
    this.errorMessage = '';

    this.service.getPlatformOrganisation(id).subscribe({
      next: (org) => {
        this.organisation = org;
        this.recalculateLicenceTotal();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load organisation.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/owner/organisations']);
  }

  selectPlan(plan: string): void {
    if (!this.organisation) return;

    this.organisation.plan = plan;

    if (plan === 'STARTER') {
      this.organisation.userLimit = 14;
      this.organisation.monthlyRevenue = 490;

      this.organisation.orgAdminLicenceLimit = 1;
      this.organisation.generalManagerLicenceLimit = 1;
      this.organisation.departmentManagerLicenceLimit = 2;
      this.organisation.employeeLicenceLimit = 10;
    }

    if (plan === 'PROFESSIONAL') {
      this.organisation.userLimit = 62;
      this.organisation.monthlyRevenue = 1200;

      this.organisation.orgAdminLicenceLimit = 1;
      this.organisation.generalManagerLicenceLimit = 3;
      this.organisation.departmentManagerLicenceLimit = 8;
      this.organisation.employeeLicenceLimit = 50;
    }

    if (plan === 'ENTERPRISE') {
      this.organisation.userLimit = 237;
      this.organisation.monthlyRevenue = 4200;

      this.organisation.orgAdminLicenceLimit = 2;
      this.organisation.generalManagerLicenceLimit = 10;
      this.organisation.departmentManagerLicenceLimit = 25;
      this.organisation.employeeLicenceLimit = 200;
    }
  }


  setStatus(status: OrgStatus): void {
    if (!this.organisation) return;
    this.organisation.status = status;
  }

  recalculateLicenceTotal(): void {
    this.licenceTotal = this.totalLicences;
  }

  changeUsers(delta: number): void {
    if (!this.organisation) return;
    this.organisation.userLimit = Math.max(0, this.organisation.userLimit + delta);
    this.recalculateLicenceTotal();
  }

  saveChanges(): void {
    if (!this.organisation) return;

    this.saving = true;

    const body = {
      organisationName: this.organisation.name,
      organisationCode: this.organisation.code,
      adminFullName: this.organisation.adminFullName,
      country: this.organisation.country,
      domain: this.organisation.domain,
      plan: this.organisation.plan,

      status: this.organisation.status,

      userLimit: this.organisation.userLimit,

      orgAdminLicenceLimit: this.organisation.orgAdminLicenceLimit,
      generalManagerLicenceLimit: this.organisation.generalManagerLicenceLimit,
      departmentManagerLicenceLimit: this.organisation.departmentManagerLicenceLimit,
      employeeLicenceLimit: this.organisation.employeeLicenceLimit,

      monthlyRevenue: this.organisation.monthlyRevenue,
      healthScore: this.organisation.healthScore,

      billingEmail: this.organisation.billingEmail,
      vatNumber: this.organisation.vatNumber,
      paymentMethod: this.organisation.paymentMethod,

      force2faAdmins: this.organisation.force2faAdmins,
      force2faSpecialists: this.organisation.force2faSpecialists,
      force2faOperators: this.organisation.force2faOperators,
      default2faMethod: this.organisation.default2faMethod,
      sessionTimeout: this.organisation.sessionTimeout,
      maxFailedLogins: this.organisation.maxFailedLogins,
      passwordMinLength: this.organisation.passwordMinLength,
      passwordExpiry: this.organisation.passwordExpiry,

      internalNotes: this.organisation.internalNotes,
      flagAtRisk: this.organisation.flagAtRisk,
      flagPaymentOverdue: this.organisation.flagPaymentOverdue,
      flagUpsellOpportunity: this.organisation.flagUpsellOpportunity,
      flagVipPriority: this.organisation.flagVipPriority,
      flagPilotFeatures: this.organisation.flagPilotFeatures,
      flagUnderReview: this.organisation.flagUnderReview
    };
    this.service.updatePlatformOrganisation(this.organisation.id, body).subscribe({
      next: () => {
        this.loadOrganisation();
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'Failed to save organisation.';
        this.saving = false;
      }
    });
  }

  formatDate(date?: string): string {
    if (!date) return '—';

    const d = new Date(date);

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' (' + this.timeAgo(d) + ')';
  }

  timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
    return diff + ' days ago';
  }
}