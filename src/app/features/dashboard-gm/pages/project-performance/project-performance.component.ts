import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyDashboard, CompanyDashboardService, RevenueForecast } from '../../services/company-dashboard.service';
@Component({ selector: 'app-project-performance', templateUrl: './project-performance.component.html', styleUrls: ['./project-performance.component.scss'] })
export class ProjectPerformanceComponent implements OnInit, OnDestroy {
  dashboard: CompanyDashboard | null = null; revenue: RevenueForecast | null = null; loading = true; error = '';
  view: 'performance' | 'revenue-forecast' = 'performance'; year = new Date().getFullYear(); actuals = true; private sub?: Subscription;
  revenueWindow: 6 | 12 = 12;
  revenueMode: 'forecast' | 'budget' | 'variance' = 'forecast';
  constructor(private service: CompanyDashboardService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void { this.sub = this.route.queryParamMap.subscribe(q => { this.view = q.get('view') === 'revenue-forecast' ? 'revenue-forecast' : 'performance'; this.load(); }); }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  load(): void { this.loading = true; this.error = ''; this.service.getDashboard().subscribe({ next: d => { this.dashboard=d; this.service.getRevenueForecast(this.year).subscribe({ next: r => { this.revenue=r; this.loading=false; }, error: () => { this.error='Revenue forecast could not be loaded.'; this.loading=false; } }); }, error: () => { this.error='Project performance data could not be loaded.'; this.loading=false; } }); }
  setView(view: 'performance' | 'revenue-forecast'): void { this.router.navigate([], { relativeTo: this.route, queryParams: { view }, queryParamsHandling: 'merge' }); }
  changeYear(): void { this.load(); }
  back(): void { this.router.navigate(['/gm/command-center']); }
  pct(value: number, total: number): number { return total ? Math.round(value / total * 100) : 0; }
  money(value: number | null | undefined): string { return new Intl.NumberFormat('en-IE', { style:'currency', currency:'EUR', notation:'compact', maximumFractionDigits:1 }).format(value || 0); }
  cell(month: number, row: number[]): number { return row[month] || 0; }
  displayedMonths(r: RevenueForecast) { return r.months.slice(0, this.revenueWindow); }
  displayedValue(project: any, index: number): number {
    const forecast = this.cell(index, project.monthlyForecast);
    if (this.revenueMode === 'forecast') return forecast;
    const monthlyBudget = (project.budget || 0) / 12;
    return this.revenueMode === 'budget' ? monthlyBudget : forecast - monthlyBudget;
  }
  monthValue(r: RevenueForecast, index: number): number {
    const forecast = r.months[index]?.forecast || 0;
    if (this.revenueMode === 'forecast') return forecast;
    const monthlyBudget = (r.totalBudget || 0) / 12;
    return this.revenueMode === 'budget' ? monthlyBudget : forecast - monthlyBudget;
  }
  isCurrentMonth(key: string): boolean { return key === `${this.year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`; }
  bestMonth(r: RevenueForecast): string { return r.months.reduce((best, month) => month.forecast > best.forecast ? month : best, r.months[0])?.label || '—'; }
}
