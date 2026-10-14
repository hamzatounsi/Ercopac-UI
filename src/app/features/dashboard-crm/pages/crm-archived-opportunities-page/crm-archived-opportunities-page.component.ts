import { Component, OnInit } from '@angular/core';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmService } from '../../services/crm.service';

@Component({
  selector: 'app-crm-archived-opportunities-page',
  templateUrl: './crm-archived-opportunities-page.component.html',
  styleUrls: ['./crm-archived-opportunities-page.component.scss']
})
export class CrmArchivedOpportunitiesPageComponent implements OnInit {
  orgId = this.crm.getOrgIdFromToken();
  archivedOpportunities: CrmOpportunity[] = [];
  loading = true;
  error = '';

  // ✅ On retire le service de toast problématique et on garde uniquement CrmService
  constructor(private crm: CrmService) {}

  ngOnInit(): void {
    this.loadArchived();
  }

  loadArchived(): void {
    this.loading = true;
    this.error = '';
    this.crm.getArchivedOpportunities(this.orgId).subscribe({
      next: (opps) => {
        this.archivedOpportunities = opps;
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message || 'Failed to load archived opportunities.';
        this.loading = false;
      }
    });
  }

   // ✅ Accepte number | null et ne fait rien si l'ID est nul
  restore(id: number | null): void {
    if (!id) return;
    
    this.crm.restoreOpportunity(this.orgId, id).subscribe({
      next: () => {
        window.alert('Opportunity restored successfully.');
        this.loadArchived();
      },
      error: e => this.error = e?.error?.message || 'Failed to restore.'
    });
  }

  // ✅ Accepte number | null et ne fait rien si l'ID est nul
  deletePermanently(id: number | null): void {
    if (!id) return;
    
    if (confirm('This will PERMANENTLY delete the opportunity and all its data. Are you sure?')) {
      this.crm.deleteOpportunity(this.orgId, id).subscribe({
        next: () => {
          window.alert('Opportunity permanently deleted.');
          this.loadArchived();
        },
        error: e => this.error = e?.error?.message || 'Failed to delete.'
      });
    }
  }
}