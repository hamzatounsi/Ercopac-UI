import { Component, OnInit } from '@angular/core';
import { GmDashboardService } from '../../services/gm-dashboard.service';
import { ProjectDashboardRow } from '../../models/project-dashboard-row.model';

@Component({
  selector: 'app-gm-dashboard-page',
  templateUrl: './gm-dashboard-page.component.html',
  styleUrls: ['./gm-dashboard-page.component.scss']
})
export class GmDashboardPageComponent implements OnInit {
  projects: ProjectDashboardRow[] = [];
  loading = false;
  error: string | null = null;
  totalProjects = 0;
  delayedCount = 0;
  attentionCount = 0;

  search = '';

  constructor(private gmService: GmDashboardService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.gmService.getProjects().subscribe({
      next: (rows) => {
        this.projects = (rows ?? []).map(row => ({
          ...row,
          timeHealth: row.timeHealth ?? 'NA'
        }));
        this.computeKpis();
      },
      error: (err) => {
        this.projects = [];
        this.error = err?.error?.message || err?.message || 'Failed to load projects';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private computeKpis(): void {
    this.totalProjects = this.projects.length;
    this.delayedCount = this.projects.filter(p => p.timeHealth === 'RED').length;
    this.attentionCount = this.projects.filter(p => p.timeHealth === 'YELLOW').length;
  }

  filtered(): ProjectDashboardRow[] {
    const s = this.search.trim().toLowerCase();
    if (!s) return this.projects;

    return this.projects.filter(p =>
      (p.code || '').toLowerCase().includes(s) ||
      (p.name || '').toLowerCase().includes(s)
    );
  }

  trackById(_: number, p: ProjectDashboardRow): number {
    return p.id ?? 0;
  }
}