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
  csData: any = null; // ✅ NOUVEAU : Données Customer Success (Type CS)
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
    
    this.service.getDashboard().subscribe({ 
      next: (dashboard) => { 
        this.dashboard = dashboard; 
        this.loading = false; 
        
        const orgId = this.crm.getOrgIdFromToken();
        
        // 1. Charger les données Sales (Type "BP" ou par défaut)
        this.crm.getSalesDashboard(orgId, 'BP').subscribe({
          next: (sales) => { this.salesData = sales; },
          error: (err) => { console.error('❌ ERROR LOADING SALES DATA:', err); }
        });

        // 2. ✅ Charger les données Customer Success (Type "CS")
        this.crm.getSalesDashboard(orgId, 'CS').subscribe({
          next: (cs) => { this.csData = cs; },
          error: (err) => { 
            console.error('❌ ERROR LOADING CS DATA:', err); 
            // Fallback pour éviter les erreurs d'affichage si l'endpoint n'est pas encore prêt
            this.csData = { orderIntakeMtd: 0, pipelineValue: 0, openOpportunities: 0, topOpportunities: [] };
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

  // ✅ NOUVEAU : Navigation vers le dashboard Customer Success
  openCustomerSuccessDashboard(): void { 
    // 🔧 Adaptez cette route si votre page CS a un chemin différent (ex: '/crm/customer-success')
    this.router.navigate(['/crm/customer-success']); 
  }

  currency(value: number | null | undefined): string { 
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0); 
  }

  // --- Helpers Sales (BP) ---
  getSalesOrderIntakeToday(): number { return this.salesData?.orderIntakeMtd || 0; }
  getSalesWonVsTarget(): number { return this.salesData?.winRate || 0; }

  // --- ✅ Helpers Customer Success (CS) ---
  getCsOrderIntakeMtd(): number { 
    return this.csData?.orderIntakeMtd || 0; 
  }

  getCsRenewalRate(): number { 
    // Utilise le winRate ou un champ spécifique 'renewalRate' si votre backend le fournit pour le CS
    return this.csData?.renewalRate || this.csData?.winRate || 0; 
  }
}