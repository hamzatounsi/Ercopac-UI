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

    warehouseLimit: 1,
    userLimit: 10,

    adminLicenceLimit: 1,
    specialistLicenceLimit: 5,
    supervisorLicenceLimit: 2,
    operatorLicenceLimit: 10,
    readonlyLicenceLimit: 5,

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
      this.form.warehouseLimit = 1;
      this.form.userLimit = 10;
      this.form.monthlyRevenue = 490;
      this.form.adminLicenceLimit = 1;
      this.form.specialistLicenceLimit = 5;
      this.form.supervisorLicenceLimit = 2;
      this.form.operatorLicenceLimit = 10;
      this.form.readonlyLicenceLimit = 5;
    }

    if (plan === 'PROFESSIONAL') {
      this.form.warehouseLimit = 4;
      this.form.userLimit = 50;
      this.form.monthlyRevenue = 1200;
      this.form.adminLicenceLimit = 2;
      this.form.specialistLicenceLimit = 12;
      this.form.supervisorLicenceLimit = 5;
      this.form.operatorLicenceLimit = 40;
      this.form.readonlyLicenceLimit = 10;
    }

    if (plan === 'ENTERPRISE') {
      this.form.warehouseLimit = 8;
      this.form.userLimit = 218;
      this.form.monthlyRevenue = 4200;
      this.form.adminLicenceLimit = 5;
      this.form.specialistLicenceLimit = 40;
      this.form.supervisorLicenceLimit = 8;
      this.form.operatorLicenceLimit = 150;
      this.form.readonlyLicenceLimit = 15;
    }
  }

  get totalLicences(): number {
    return this.form.adminLicenceLimit +
      this.form.specialistLicenceLimit +
      this.form.supervisorLicenceLimit +
      this.form.operatorLicenceLimit +
      this.form.readonlyLicenceLimit;
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