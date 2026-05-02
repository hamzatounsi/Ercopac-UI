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
    adminFullName: '',
    adminEmail: '',
    adminPassword: ''
  };

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
        this.successMessage = `Organisation ${res.organisationName} created with admin ${res.adminEmail}.`;
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