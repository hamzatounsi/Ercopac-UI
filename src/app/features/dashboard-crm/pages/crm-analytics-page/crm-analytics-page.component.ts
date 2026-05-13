// Path: src/app/features/dashboard-crm/pages/crm-analytics-page/crm-analytics-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CrmService } from '../../services/crm.service';
import { CrmDashboard } from '../../models/crm-dashboard.model';

@Component({
  selector: 'app-crm-analytics-page',
  templateUrl: './crm-analytics-page.component.html',
  styleUrls: ['./crm-analytics-page.component.scss']
})
export class CrmAnalyticsPageComponent implements OnInit {

  orgId = this.crmService.getOrgIdFromToken();
  dashboard: CrmDashboard | null = null;
  loading = false;

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.loading = true;
    this.crmService.getDashboard(this.orgId).subscribe({
      next: d => { this.dashboard = d; this.loading = false; },
      error: err => { console.error(err); this.loading = false; }
    });
  }

  formatValue(v: number | null): string {
    if (!v) return '—';
    if (v >= 1000000) return '€' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return '€' + (v / 1000).toFixed(0) + 'K';
    return '€' + v.toLocaleString();
  }
}