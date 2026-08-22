import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MilestoneService } from '../../services/milestone.service';

@Component({
  selector: 'app-milestone-dashboard',
  templateUrl: './milestone-dashboard.component.html', // ✅ Utilise templateUrl
  styleUrls: ['./milestone-dashboard.component.scss']
})
export class MilestoneDashboardComponent implements OnInit {
  projectId!: number;
  milestones: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private milestoneService: MilestoneService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadMilestones();
  }

  loadMilestones(): void {
    this.milestoneService.getMilestoneTypes().subscribe({
      next: (types) => this.milestones = types,
      error: (err) => console.error('Failed to load milestones', err)
    });
  }
}