import { Component, OnInit } from '@angular/core';
import { CrmOpportunity } from '../../models/crm-opportunity.model';
import { CrmService } from '../../services/crm.service';
import { CrmI18nService } from 'src/app/features/dashboard-crm/services/crm-i18n.service';

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
  constructor(public i18n: CrmI18nService,
    private crm: CrmService) {}

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
        this.error = this.i18n.error(e, 'archived.failedLoadArchivedOpportunities');
        this.loading = false;
      }
    });
  }

   // ✅ Accepte number | null et ne fait rien si l'ID est nul
  restore(id: number | null): void {
    if (!id) return;
    
    this.crm.restoreOpportunity(this.orgId, id).subscribe({
      next: () => {
        window.alert(this.i18n.t('archived.opportunityRestoredSuccessfully'));
        this.loadArchived();
      },
      error: e => this.error = this.i18n.error(e, 'archived.failedRestore')
    });
  }

  // ✅ Accepte number | null et ne fait rien si l'ID est nul
  deletePermanently(id: number | null): void {
    if (!id) return;
    
    if (confirm(this.i18n.t('archived.willPermanentlyDeleteOpportunity'))) {
      this.crm.deleteOpportunity(this.orgId, id).subscribe({
        next: () => {
          window.alert(this.i18n.t('archived.opportunityPermanentlyDeleted'));
          this.loadArchived();
        },
        error: e => this.error = this.i18n.error(e, 'archived.failedDelete')
      });
    }
  }
}