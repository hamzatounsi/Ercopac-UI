import { Component, OnInit } from '@angular/core';
import {
  GmSecurityService,
  PasswordResetRequestDto
} from 'src/app/features/dashboard-gm/services/gm-security.service';

@Component({
  selector: 'app-security-tab',
  templateUrl: './security-tab.component.html',
  styleUrls: ['./security-tab.component.scss']
})
export class SecurityTabComponent implements OnInit {
  requests: PasswordResetRequestDto[] = [];
  loading = false;
  msg = '';

  constructor(private securityService: GmSecurityService) {}

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
        this.msg = 'Failed to load password reset requests';
        this.loading = false;
      }
    });
  }

  approve(id: number): void {
    this.securityService.approve(id).subscribe({
      next: () => {
        this.msg = 'Password reset request approved ✅';
        this.loadRequests();
      },
      error: err => {
        console.error(err);
        this.msg = 'Approval failed ❌';
      }
    });
  }

  reject(id: number): void {
    const note = prompt('Reason for rejection (optional):') || '';

    this.securityService.reject(id, note).subscribe({
      next: () => {
        this.msg = 'Password reset request rejected';
        this.loadRequests();
      },
      error: err => {
        console.error(err);
        this.msg = 'Reject failed ❌';
      }
    });
  }
}