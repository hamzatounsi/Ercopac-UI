import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmDashboardService } from '../../../services/gm-dashboard.service';
import { ProjectDetails } from '../../../models/project-details.model';

@Component({
  selector: 'app-gm-project-details',
  templateUrl: './gm-project-details.component.html',
  styleUrls: ['./gm-project-details.component.scss']
})
export class GmProjectDetailsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  project: ProjectDetails | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmService: GmDashboardService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid project id';
      return;
    }

    this.loading = true;
    this.error = null;

    this.gmService.getProjectById(id).subscribe({
      next: (p) => {
        this.project = p;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load project';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/gm/projectum']);
  }

  formatCurrency(value?: number): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }
}