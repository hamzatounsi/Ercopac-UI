import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CrmService } from '../../services/crm.service';
import { CrmI18nService } from '../../services/crm-i18n.service';

@Component({
  selector: 'app-sales-dashboard',
  templateUrl: './sales-dashboard.component.html',
  styleUrls: ['./sales-dashboard.component.scss']
})
export class SalesDashboardComponent implements OnInit {
  loading = true;
  error = '';
  data: any = null;
  orgId = this.crm.getOrgIdFromToken();

  constructor(private crm: CrmService, private router: Router, public i18n: CrmI18nService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.crm.getSalesDashboard(this.orgId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load sales dashboard.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/gm/command-center']); // Ajuste la route si besoin
  }

  money(value: number | null | undefined): string {
    if (value == null) return '€0';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  pct(value: number | null | undefined): string {
    return value != null ? value.toFixed(1) + '%' : '0%';
  }

  maxPipelineValue(): number {
    if (!this.data?.pipelineByStage?.length) return 1;
    return Math.max(...this.data.pipelineByStage.map((s: any) => s.value || 0), 1);
  }
}