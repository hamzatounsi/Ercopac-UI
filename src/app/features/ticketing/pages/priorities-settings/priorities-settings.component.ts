import { Component, OnInit } from '@angular/core';
import { TicketConfigService, TicketPriorityConfig } from '../../services/ticket-config.service';

@Component({
  selector: 'app-priorities-settings',
  templateUrl: './priorities-settings.component.html',
  styleUrls: ['./priorities-settings.component.scss']
})
export class PrioritiesSettingsComponent implements OnInit {
  priorities: TicketPriorityConfig[] = [];

  constructor(private configService: TicketConfigService) {}

  ngOnInit() {
    this.loadPriorities();
  }

  loadPriorities() {
    this.configService.getPriorities().subscribe({
      next: (data) => this.priorities = data,
      error: (err) => console.error('Error loading priorities:', err)
    });
  }

  getPriorityBadgeClass(priority: string): string {
    const classes: any = {
      'HIGH': 'bg-red-100 text-red-800',
      'MEDIUM': 'bg-orange-100 text-orange-800',
      'LOW': 'bg-green-100 text-green-800'
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  savePriority(priority: TicketPriorityConfig) {
    this.configService.updatePriority(priority.id, {
      firstResponseSlaHours: priority.firstResponseSlaHours,
      resolutionSlaHours: priority.resolutionSlaHours
    }).subscribe({
      next: () => console.log('Priority updated:', priority),
      error: (err) => console.error('Error updating priority:', err)
    });
  }
}