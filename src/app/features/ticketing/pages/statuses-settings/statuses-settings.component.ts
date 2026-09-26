import { Component, OnInit } from '@angular/core';
import { TicketConfigService, TicketStatusConfig } from '../../services/ticket-config.service';

@Component({
  selector: 'app-statuses-settings',
  templateUrl: './statuses-settings.component.html',
  styleUrls: ['./statuses-settings.component.scss']
})
export class StatusesSettingsComponent implements OnInit {
  statuses: TicketStatusConfig[] = [];

  constructor(private configService: TicketConfigService) {}

  ngOnInit() {
    this.loadStatuses();
  }

  loadStatuses() {
    this.configService.getStatuses().subscribe({
      next: (data) => this.statuses = data,
      error: (err) => console.error('Error loading statuses:', err)
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: any = {
      'OPEN': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-orange-100 text-orange-800',
      'ESCALATED': 'bg-red-100 text-red-800',
      'RESOLVED': 'bg-green-100 text-green-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  editStatus(status: TicketStatusConfig) {
    console.log('Edit status:', status);
  }
}