import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { PasswordResetRequest, SecuritySettings } from '../../models/org-admin.models';
import { adminErrorMessage, OrgAdminService } from '../../services/org-admin.service';
import { AdminToastService } from '../../shared/admin-toast.service';

@Component({ selector: 'app-org-admin-settings', templateUrl: './org-admin-settings.component.html', styleUrls: ['./org-admin-settings.component.scss'] })
export class OrgAdminSettingsComponent implements OnInit {
  settings: SecuritySettings | null = null;
  requests: PasswordResetRequest[] = [];
  loading = true;
  refreshingRequests = false;
  saving = false;
  errorMessage = '';
  requestError = '';
  pendingDecision: { request: PasswordResetRequest; action: 'approve' | 'reject' } | null = null;
  readonly form = this.fb.nonNullable.group({
    sessionTimeout: this.fb.nonNullable.control<SecuritySettings['sessionTimeout']>('4_HOURS', Validators.required),
    maxFailedLogins: this.fb.nonNullable.control(5, [Validators.required, Validators.min(3), Validators.max(10)]),
    passwordMinLength: this.fb.nonNullable.control(8, [Validators.required, Validators.min(8), Validators.max(64)])
  });
  readonly rejectionNote = this.fb.nonNullable.control('', Validators.maxLength(500));

  constructor(private readonly fb: FormBuilder, private readonly service: OrgAdminService, private readonly toast: AdminToastService) {}
  ngOnInit(): void { this.load(); }
  @HostListener('document:keydown.escape') onEscape(): void { if (!this.saving) this.pendingDecision = null; }

  load(): void {
    this.loading = true; this.errorMessage = '';
    forkJoin({ settings: this.service.getSecuritySettings(), requests: this.service.getPendingPasswordResets() })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: result => { this.settings = result.settings; this.requests = result.requests; this.resetForm(result.settings); },
        error: error => this.errorMessage = adminErrorMessage(error, 'Could not load organisation security settings.')
      });
  }

  saveSettings(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.errorMessage = '';
    this.service.updateSecuritySettings(this.form.getRawValue()).pipe(finalize(() => this.saving = false)).subscribe({
      next: settings => { this.settings = settings; this.resetForm(settings); this.toast.show('Security settings saved. New sessions use the updated policy.'); },
      error: error => this.errorMessage = adminErrorMessage(error, 'Could not save security settings.')
    });
  }

  discardSettings(): void { if (this.settings) this.resetForm(this.settings); }
  openDecision(request: PasswordResetRequest, action: 'approve' | 'reject'): void { this.rejectionNote.reset(''); this.pendingDecision = { request, action }; }

  confirmDecision(): void {
    const decision = this.pendingDecision; if (!decision || this.saving || this.rejectionNote.invalid) return;
    this.saving = true;
    const action = decision.action === 'approve'
      ? this.service.approvePasswordReset(decision.request.id)
      : this.service.rejectPasswordReset(decision.request.id, this.rejectionNote.value.trim());
    action.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.toast.show(decision.action === 'approve' ? 'Password reset request approved.' : 'Password reset request rejected.'); this.pendingDecision = null; this.loadRequests(); },
      error: error => { this.pendingDecision = null; this.toast.show(adminErrorMessage(error, 'Could not process the password reset request.'), 'error'); }
    });
  }

  loadRequests(): void {
    this.refreshingRequests = true; this.requestError = '';
    this.service.getPendingPasswordResets().pipe(finalize(() => this.refreshingRequests = false)).subscribe({
      next: requests => this.requests = requests,
      error: error => this.requestError = adminErrorMessage(error, 'Could not refresh password reset requests.')
    });
  }

  private resetForm(settings: SecuritySettings): void { this.form.reset(settings); }
}
