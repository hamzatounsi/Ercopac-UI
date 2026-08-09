import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformOrganisationService } from '../../services/platform-organisation.service';
import { CreateOrganisationWithAdminRequest } from '../../models/create-organisation-with-admin-request.model';

@Component({
  selector: 'app-create-organisation-page',
  templateUrl: './create-organisation-page.component.html',
  styleUrls: ['./create-organisation-page.component.scss']
})
export class CreateOrganisationPageComponent {
  loading = false;
  errorMessage = '';
  successMessage = '';

  form: CreateOrganisationWithAdminRequest = {
    organisationName: '',
    organisationCode: '',
    country: '',
    domain: '',
    plan: 'STARTER',

    userLimit: 20,

    orgAdminLicenceLimit: 1,
    projectManagerLicenceLimit: 1,
    departmentManagerLicenceLimit: 2,
    employeeLicenceLimit: 10,
    salesManagerLicenceLimit: 1,
    clientLicenceLimit: 5,

    monthlyRevenue: 490,
    healthScore: 100,

    billingEmail: '',
    vatNumber: '',
    paymentMethod: 'SEPA_DIRECT_DEBIT',

    adminFullName: '',
    adminEmail: '',
    adminPassword: ''
  };

  selectPlan(plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'): void {
    this.form.plan = plan;

    if (plan === 'STARTER') {
      this.form.userLimit = 20;
      this.form.monthlyRevenue = 490;

      this.form.orgAdminLicenceLimit = 1;
      this.form.projectManagerLicenceLimit = 1;
      this.form.departmentManagerLicenceLimit = 2;
      this.form.employeeLicenceLimit = 10;
      this.form.salesManagerLicenceLimit = 1;
      this.form.clientLicenceLimit = 5;
    }

    if (plan === 'PROFESSIONAL') {
      this.form.userLimit = 92;
      this.form.monthlyRevenue = 1200;

      this.form.orgAdminLicenceLimit = 1;
      this.form.projectManagerLicenceLimit = 3;
      this.form.departmentManagerLicenceLimit = 8;
      this.form.employeeLicenceLimit = 50;
      this.form.salesManagerLicenceLimit = 5;
      this.form.clientLicenceLimit = 25;
    }

    if (plan === 'ENTERPRISE') {
      this.form.userLimit = 357;
      this.form.monthlyRevenue = 4200;

      this.form.orgAdminLicenceLimit = 2;
      this.form.projectManagerLicenceLimit = 10;
      this.form.departmentManagerLicenceLimit = 25;
      this.form.employeeLicenceLimit = 200;
      this.form.salesManagerLicenceLimit = 20;
      this.form.clientLicenceLimit = 100;
    }
  }

  get totalLicences(): number {
    return this.form.orgAdminLicenceLimit +
      this.form.projectManagerLicenceLimit +
      this.form.departmentManagerLicenceLimit +
      this.form.employeeLicenceLimit +
      this.form.salesManagerLicenceLimit +
      this.form.clientLicenceLimit;
  }

  constructor(
    private service: PlatformOrganisationService,
    private router: Router
  ) {}

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.organisationName || !this.form.organisationCode || !this.form.adminEmail || !this.form.adminPassword) {
      this.errorMessage = 'Please fill all required fields.';
      return;
    }

    this.loading = true;
    this.service.createOrganisationWithAdmin(this.form).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/owner/organisations', res.organisationId]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to create organisation.';
      }
    });
  }

  back(): void {
    this.router.navigate(['/owner']);
  }
}
