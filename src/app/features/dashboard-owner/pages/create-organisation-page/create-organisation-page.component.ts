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

    userLimit: 14,

    orgAdminLicenceLimit: 1,
    generalManagerLicenceLimit: 1,
    departmentManagerLicenceLimit: 2,
    employeeLicenceLimit: 10,

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
      this.form.userLimit = 14;
      this.form.monthlyRevenue = 490;

      this.form.orgAdminLicenceLimit = 1;
      this.form.generalManagerLicenceLimit = 1;
      this.form.departmentManagerLicenceLimit = 2;
      this.form.employeeLicenceLimit = 10;
    }

    if (plan === 'PROFESSIONAL') {
      this.form.userLimit = 62;
      this.form.monthlyRevenue = 1200;

      this.form.orgAdminLicenceLimit = 1;
      this.form.generalManagerLicenceLimit = 3;
      this.form.departmentManagerLicenceLimit = 8;
      this.form.employeeLicenceLimit = 50;
    }

    if (plan === 'ENTERPRISE') {
      this.form.userLimit = 237;
      this.form.monthlyRevenue = 4200;

      this.form.orgAdminLicenceLimit = 2;
      this.form.generalManagerLicenceLimit = 10;
      this.form.departmentManagerLicenceLimit = 25;
      this.form.employeeLicenceLimit = 200;
    }
  }

  get totalLicences(): number {
    return this.form.orgAdminLicenceLimit +
      this.form.generalManagerLicenceLimit +
      this.form.departmentManagerLicenceLimit +
      this.form.employeeLicenceLimit;
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
    console.log('CREATE ORG PAYLOAD', this.form);

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