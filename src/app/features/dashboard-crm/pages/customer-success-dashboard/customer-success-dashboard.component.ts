import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CrmService } from '../../services/crm.service';

@Component({
  selector: 'app-customer-success-dashboard',
  templateUrl: './customer-success-dashboard.component.html',
  styleUrls: ['./customer-success-dashboard.component.scss']
})
export class CustomerSuccessDashboardComponent implements OnInit {
  loading = true;
  error = '';
  data: any = null;
  orgId = this.crm.getOrgIdFromToken();

  constructor(private crm: CrmService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    // ✅ Filter by CS type
    this.crm.getSalesDashboard(this.orgId, 'CS').subscribe({
      next: (res: any) => { 
        console.log('✅ CS Dashboard Data Received:', res);
        this.data = res; 
        this.loading = false; 
      },
      error: (err: any) => {
        console.error('❌ Error loading CS dashboard:', err);
        this.error = 'Failed to load Customer Success dashboard.';
        this.loading = false;
      }
    });
  }

  back(): void { this.router.navigate(['/gm/command-center']); }

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