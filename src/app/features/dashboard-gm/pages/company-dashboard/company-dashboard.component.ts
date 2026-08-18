import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyDashboard, CompanyDashboardService } from '../../services/company-dashboard.service';

@Component({ selector: 'app-company-dashboard', templateUrl: './company-dashboard.component.html', styleUrls: ['./company-dashboard.component.scss'] })
export class CompanyDashboardComponent implements OnInit {
  dashboard: CompanyDashboard | null = null;
  loading = true;
  error = '';
  constructor(private readonly service: CompanyDashboardService, private readonly router: Router) {}
  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    this.loading = true; this.error = '';
    this.service.getDashboard().subscribe({ next: dashboard => { this.dashboard = dashboard; this.loading = false; }, error: () => { this.error = 'Company performance data could not be loaded.'; this.loading = false; } });
  }
  percentage(value: number, total: number): number { return total ? Math.round((value / total) * 100) : 0; }
  openProjectPerformance(): void { this.router.navigate(['/gm/command-center/project-performance'], { queryParams: { view: 'performance' } }); }
  currency(value: number | null | undefined): string { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0); }
}
