import { Component, OnInit } from '@angular/core';
import {
  GmSecurityService,
  PasswordResetRequestDto
} from 'src/app/features/dashboard-gm/services/gm-security.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-security-tab',
  templateUrl: './security-tab.component.html',
  styleUrls: ['./security-tab.component.scss']
})
export class SecurityTabComponent implements OnInit {
  requests: PasswordResetRequestDto[] = [];
  loading = false;
  msg = '';

  constructor(private readonly i18n: I18nService, private securityService: GmSecurityService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.msg = '';

    this.securityService.getPendingRequests().subscribe({
      next: data => {
        this.requests = data;
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.msg = this.i18n.t('gm.securityTab.failedLoadRequests');
        this.loading = false;
      }
    });
  }

  approve(id: number): void {
    this.securityService.approve(id).subscribe({
      next: () => {
        this.msg = this.i18n.t('gm.securityTab.requestApproved');
        this.loadRequests();
      },
      error: err => {
        console.error(err);
        this.msg = this.i18n.t('gm.securityTab.approvalFailed');
      }
    });
  }

  reject(id: number): void {
    const note = prompt(this.i18n.t('gm.securityTab.rejectionReason')) || '';

    this.securityService.reject(id, note).subscribe({
      next: () => {
        this.msg = this.i18n.t('gm.securityTab.requestRejected');
        this.loadRequests();
      },
      error: err => {
        console.error(err);
        this.msg = this.i18n.t('gm.securityTab.rejectFailed');
      }
    });
  }
}