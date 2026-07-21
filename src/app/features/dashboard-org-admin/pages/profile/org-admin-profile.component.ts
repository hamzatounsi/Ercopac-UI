import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { OrganisationProfile } from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({ selector: 'app-org-admin-profile', templateUrl: './org-admin-profile.component.html', styleUrls: ['./org-admin-profile.component.scss'] })
export class OrgAdminProfileComponent implements OnInit {
  profile: OrganisationProfile | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    country: ['', Validators.maxLength(80)],
    domain: ['', [Validators.maxLength(120), Validators.pattern(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/)]]
  });

  constructor(private readonly fb: FormBuilder, private readonly service: OrgAdminService, private readonly toast: AdminToastService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.service.getProfile().pipe(finalize(() => this.loading = false)).subscribe({
      next: profile => { this.profile = profile; this.resetForm(profile); },
      error: error => this.errorMessage = adminErrorMessage(error, 'Could not load the organisation profile.')
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.errorMessage = '';
    const value = this.form.getRawValue();
    this.service.updateProfile({ name: value.name.trim(), country: value.country.trim() || null, domain: value.domain.trim() || null })
      .pipe(finalize(() => this.saving = false)).subscribe({
        next: profile => { this.profile = profile; this.resetForm(profile); this.toast.show('Organisation profile saved.'); },
        error: error => this.errorMessage = adminErrorMessage(error, 'Could not save the organisation profile.')
      });
  }

  cancel(): void { if (this.profile) this.resetForm(this.profile); }
  private resetForm(profile: OrganisationProfile): void {
    this.form.reset({ name: profile.name, country: profile.country || '', domain: profile.domain || '' });
  }
}
