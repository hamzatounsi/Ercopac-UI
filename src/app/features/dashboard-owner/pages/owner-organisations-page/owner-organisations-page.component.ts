import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { OwnerDashboardService } from '../../services/owner-dashboard.service';
import { PlatformOrganisation } from '../../models/platform-organisation.model';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-owner-organisations-page',
  templateUrl: './owner-organisations-page.component.html',
  styleUrls: ['./owner-organisations-page.component.scss']
})
export class OwnerOrganisationsPageComponent implements OnInit {
  searchTerm = '';
  loading = false;
  errorMessage = '';

  organisations: PlatformOrganisation[] = [];

  constructor(
    private ownerDashboardService: OwnerDashboardService,
    private router: Router,
    private readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.loadOrganisations();
  }

  loadOrganisations(): void {
    this.loading = true;
    this.errorMessage = '';

    this.ownerDashboardService.getPlatformOrganisations().subscribe({
      next: (organisations) => {
        this.organisations = organisations ?? [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load platform organisations', error);
        this.errorMessage = this.i18n.t('owner.organisations.failedLoadOrganisations');
        this.loading = false;
      }
    });
  }

  get filteredOrganisations(): PlatformOrganisation[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.organisations;
    }

    return this.organisations.filter(org =>
      org.name.toLowerCase().includes(term) ||
      org.code.toLowerCase().includes(term) ||
      (org.country ?? '').toLowerCase().includes(term) ||
      org.plan.toLowerCase().includes(term) ||
      org.status.toLowerCase().includes(term)
    );
  }

  get activeCount(): number {
    return this.organisations.filter(org => org.status === 'ACTIVE').length;
  }

  get totalUsersLimit(): number {
    return this.organisations.reduce((sum, org) => sum + org.userLimit, 0);
  }

  get totalMrr(): number {
    return this.organisations.reduce((sum, org) => sum + org.monthlyRevenue, 0);
  }

  get averageHealth(): number {
    if (this.organisations.length === 0) {
      return 0;
    }

    const total = this.organisations.reduce((sum, org) => sum + org.healthScore, 0);
    return Math.round(total / this.organisations.length);
  }

  onCreateOrganisation(): void {
    this.router.navigate(['/owner/create-organisation']);
  }

  openOrganisation(org: PlatformOrganisation): void {
    this.router.navigate(['/owner/organisations', org.id]);
  }

  suspendOrganisation(org: PlatformOrganisation, event: MouseEvent): void {
    event.stopPropagation();

    this.ownerDashboardService
      .updatePlatformOrganisationStatus(org.id, 'SUSPENDED')
      .subscribe({
        next: () => this.loadOrganisations(),
        error: (error) => {
          console.error('Failed to suspend organisation', error);
          this.errorMessage = this.i18n.t('owner.organisations.failedUpdateOrganisationStatus');
        }
      });
  }

  activateOrganisation(org: PlatformOrganisation, event: MouseEvent): void {
    event.stopPropagation();

    this.ownerDashboardService
      .updatePlatformOrganisationStatus(org.id, 'ACTIVE')
      .subscribe({
        next: () => this.loadOrganisations(),
        error: (error) => {
          console.error('Failed to activate organisation', error);
          this.errorMessage = this.i18n.t('owner.organisations.failedUpdateOrganisationStatus');
        }
      });
  }

  trackByOrganisation(index: number, org: PlatformOrganisation): number {
    return org.id;
  }
}