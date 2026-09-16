import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyDashboard, CompanyDashboardService } from '../../services/company-dashboard.service';
import { CrmService } from '../../../dashboard-crm/services/crm.service'; 

@Component({ 
  selector: 'app-company-dashboard', 
  templateUrl: './company-dashboard.component.html', 
  styleUrls: ['./company-dashboard.component.scss'] 
})
export class CompanyDashboardComponent implements OnInit {
  dashboard: CompanyDashboard | null = null;
  salesData: any = null; 
  loading = true;
  error = '';

  constructor(
    private readonly service: CompanyDashboardService, 
    private readonly router: Router,
    private readonly crm: CrmService 
  ) {}

  ngOnInit(): void { 
    this.refresh(); 
  }

  refresh(): void {
    this.loading = true; 
    this.error = '';
    
    // 1. Load main Command Center dashboard
    this.service.getDashboard().subscribe({ 
      next: (dashboard) => { 
        this.dashboard = dashboard; 
        this.loading = false; 
        
        // 2. Load sales data in the background
        const orgId = this.crm.getOrgIdFromToken();
        this.crm.getSalesDashboard(orgId).subscribe({
          next: (sales) => { 
            this.salesData = sales; 
            
            // 🔥 CRUCIAL DEBUG: This will show us EXACTLY what the backend is returning
            console.log('🔥 SALES DATA RECEIVED FROM BACKEND:', this.salesData); 
          },
          error: (err) => { 
            console.error('❌ ERROR LOADING SALES DATA:', err); 
          }
        });
      }, 
      error: (err) => { 
        console.error('❌ ERROR LOADING MAIN DASHBOARD:', err);
        this.error = 'Company performance data could not be loaded.'; 
        this.loading = false; 
      } 
    });
  }

  percentage(value: number, total: number): number { 
    return total ? Math.round((value / total) * 100) : 0; 
  }

  openProjectPerformance(): void { 
    this.router.navigate(['/gm/command-center/project-performance'], { queryParams: { view: 'performance' } }); 
  }

  openSalesDashboard(): void { 
    this.router.navigate(['/crm/sales']); 
  }

  currency(value: number | null | undefined): string { 
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0); 
  }

  // ✅ Safe helper methods for the HTML template
  getSalesOrderIntakeToday(): number {
    return this.salesData?.orderIntakeMtd || 0;
  }

  getSalesWonVsTarget(): number {
    return this.salesData?.winRate || 0;
  }

  getSalesPipelineValue(): number {
    return this.salesData?.pipelineValue || 0;
  }

  getSalesOpenOpportunities(): number {
    return this.salesData?.openOpportunities || 0;
  }

  getSalesTopOpportunitiesCount(): number {
    return this.salesData?.topOpportunities?.length || 0;
  }
}