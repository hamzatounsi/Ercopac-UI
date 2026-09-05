import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { CrmPermissionsService } from '../../services/crm-permissions.service';
import { CrmAccount } from '../../models/crm-account.model';
import { CrmLead } from '../../models/crm-lead.model';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmService } from '../../services/crm.service';

interface CrmSearchResults {
  accounts: CrmAccount[];
  leads: CrmLead[];
  opportunities: CrmOpportunity[];
}

@Component({ selector: 'app-crm-layout', templateUrl: './crm-layout.component.html', styleUrls: ['./crm-layout.component.scss'] })
export class CrmLayoutComponent {
  readonly mainItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/crm/dashboard' },
    { label: 'Accounts', icon: 'business_center', route: '/crm/accounts' },
    { label: 'Leads', icon: 'person', route: '/crm/leads' },
    { label: 'Opportunities', icon: 'trending_up', route: '/crm/opportunities' }
  ];
  readonly insightItems = [
    { label: 'Reports', icon: 'description', route: '/crm/reports' },
    { label: 'Analytics', icon: 'analytics', route: '/crm/analytics' }
  ];
  query = '';
  searching = false;
  showResults = false;
  results: CrmSearchResults = { accounts: [], leads: [], opportunities: [] };

  constructor(private router: Router, private crm: CrmService, public auth: AuthService, public permissions: CrmPermissionsService) {}
  get initials(): string { return (this.auth.getCurrentUsername() || 'User').split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase(); }
  get organisation(): string { return this.auth.getOrganisationName() || 'Organisation'; }
  goBack(): void { this.router.navigate(['/workspace']); }

  search(value: string): void {
    const query = value.trim();
    this.query = value;
    if (query.length < 2) {
      this.searching = false;
      this.showResults = false;
      this.results = { accounts: [], leads: [], opportunities: [] };
      return;
    }

    const orgId = this.crm.getOrgIdFromToken();
    this.searching = true;
    this.showResults = true;
    forkJoin({
      accounts: this.crm.getAccounts(orgId, query),
      leads: this.crm.getLeads(orgId, query),
      opportunities: this.crm.getOpportunities(orgId)
    }).subscribe({
      next: results => {
        if (this.query.trim() !== query) return;
        const needle = query.toLowerCase();
        this.results = {
          accounts: results.accounts.slice(0, 4),
          leads: results.leads.slice(0, 4),
          opportunities: results.opportunities.filter(item =>
            item.name.toLowerCase().includes(needle) || (item.accountName || '').toLowerCase().includes(needle)
          ).slice(0, 4)
        };
        this.searching = false;
      },
      error: () => {
        if (this.query.trim() === query) {
          this.results = { accounts: [], leads: [], opportunities: [] };
          this.searching = false;
        }
      }
    });
  }

  openResult(route: (string | number | null)[]): void {
    this.showResults = false;
    this.query = '';
    this.router.navigate(route);
  }

  closeResults(): void { window.setTimeout(() => this.showResults = false, 150); }
  get hasResults(): boolean { return this.results.accounts.length + this.results.leads.length + this.results.opportunities.length > 0; }
}
