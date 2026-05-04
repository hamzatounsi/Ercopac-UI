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

  adminLicences = 1;
  specialistLicences = 5;
  supervisorLicences = 2;
  operatorLicences = 10;
  readonlyLicences = 5;

  internalNotes = '';

  flagAtRisk = false;
  flagPaymentOverdue = false;
  flagUpsell = false;
  flagVip = false;
  flagPilot = false;
  flagUnderReview = false;

  get totalLicences(): number {
    if (!this.organisation) return 0;

    return this.organisation.adminLicenceLimit +
      this.organisation.specialistLicenceLimit +
      this.organisation.supervisorLicenceLimit +
      this.organisation.operatorLicenceLimit +
      this.organisation.readonlyLicenceLimit;
  }

  changeLicence(
    type: 'admin' | 'specialist' | 'supervisor' | 'operator' | 'readonly',
    delta: number
  ): void {
    if (!this.organisation) return;

    if (type === 'admin') {
      this.organisation.adminLicenceLimit = Math.max(0, this.organisation.adminLicenceLimit + delta);
    }

    if (type === 'specialist') {
      this.organisation.specialistLicenceLimit = Math.max(0, this.organisation.specialistLicenceLimit + delta);
    }

    if (type === 'supervisor') {
      this.organisation.supervisorLicenceLimit = Math.max(0, this.organisation.supervisorLicenceLimit + delta);
    }

    if (type === 'operator') {
      this.organisation.operatorLicenceLimit = Math.max(0, this.organisation.operatorLicenceLimit + delta);
    }

    if (type === 'readonly') {
      this.organisation.readonlyLicenceLimit = Math.max(0, this.organisation.readonlyLicenceLimit + delta);
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
      this.organisation.warehouseLimit = 1;
      this.organisation.userLimit = 10;
      this.organisation.monthlyRevenue = 490;

      this.organisation.adminLicenceLimit = 1;
      this.organisation.specialistLicenceLimit = 5;
      this.organisation.supervisorLicenceLimit = 2;
      this.organisation.operatorLicenceLimit = 10;
      this.organisation.readonlyLicenceLimit = 5;
    }

    if (plan === 'PROFESSIONAL') {
      this.organisation.warehouseLimit = 4;
      this.organisation.userLimit = 50;
      this.organisation.monthlyRevenue = 1200;

      this.organisation.adminLicenceLimit = 2;
      this.organisation.specialistLicenceLimit = 12;
      this.organisation.supervisorLicenceLimit = 5;
      this.organisation.operatorLicenceLimit = 40;
      this.organisation.readonlyLicenceLimit = 10;
    }

    if (plan === 'ENTERPRISE') {
      this.organisation.warehouseLimit = 8;
      this.organisation.userLimit = 218;
      this.organisation.monthlyRevenue = 4200;

      this.organisation.adminLicenceLimit = 5;
      this.organisation.specialistLicenceLimit = 40;
      this.organisation.supervisorLicenceLimit = 8;
      this.organisation.operatorLicenceLimit = 150;
      this.organisation.readonlyLicenceLimit = 15;
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

      warehouseLimit: this.organisation.warehouseLimit,
      userLimit: this.organisation.userLimit,

      adminLicenceLimit: this.organisation.adminLicenceLimit,
      specialistLicenceLimit: this.organisation.specialistLicenceLimit,
      supervisorLicenceLimit: this.organisation.supervisorLicenceLimit,
      operatorLicenceLimit: this.organisation.operatorLicenceLimit,
      readonlyLicenceLimit: this.organisation.readonlyLicenceLimit,

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