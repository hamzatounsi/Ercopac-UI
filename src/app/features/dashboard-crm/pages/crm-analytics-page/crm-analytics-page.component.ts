import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CrmAnalytics } from '../../models/crm-analytics.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmService } from '../../services/crm.service';
import { CrmI18nService } from '../../services/crm-i18n.service';

@Component({ selector: 'app-crm-analytics-page', templateUrl: './crm-analytics-page.component.html', styleUrls: ['./crm-analytics-page.component.scss'] })
export class CrmAnalyticsPageComponent implements OnInit {
  analytics: CrmAnalytics | null = null;
  loading = true;
  error = '';
  type = '';
  constructor(private readonly crm: CrmService, private readonly router: Router, public i18n: CrmI18nService) {}
  
  ngOnInit(): void { this.load(); }
  
  load(): void {
    this.loading = true; this.error = '';
    this.crm.getAnalytics(this.crm.getOrgIdFromToken(), this.type || undefined).pipe(finalize(() => this.loading = false)).subscribe({
      next: value => this.analytics = value,
      error: () => this.error = this.i18n.t('analytics.error.load')
    });
  }
  
  maxStage(): number { return Math.max(1, ...(this.analytics?.pipelineByStage.map(value => value.count) || [0])); }
  maxSource(): number { return Math.max(1, ...(this.analytics?.leadsBySource.map(value => value.count) || [0])); }
  money(value: number | null | undefined, currency = 'EUR'): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
  }
  expectedRevenue(item: CrmOpportunity): number { return item.expectedRevenue ?? (item.value || 0) * (1 - (item.discount || 0) / 100) * item.probability / 100; }
  openOpportunity(id: number | null): void { if (id) this.router.navigate(['/crm/opportunities', id]); }
}