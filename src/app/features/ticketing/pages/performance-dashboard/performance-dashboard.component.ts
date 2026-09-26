import { Component, OnInit } from '@angular/core';
import { TicketService, TeamKpis, AgentWorkload } from '../../services/ticket.service';

@Component({
  selector: 'app-performance-dashboard',
  templateUrl: './performance-dashboard.component.html',
  styleUrls: ['./performance-dashboard.component.scss']
})
export class PerformanceDashboardComponent implements OnInit {
  activeTab: 'org' | 'team' = 'org';
  
  basicStats: any;
  teamKpis?: TeamKpis;
  agentWorkload: AgentWorkload[] = [];
  totalTickets: number = 0;
  statusDistribution: Record<string, number> = {};

  constructor(private ticketService: TicketService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    if (this.activeTab === 'org') {
      this.ticketService.stats().subscribe((data: any) => {
        this.basicStats = data;
        this.statusDistribution = {
          'OPEN': data.open || 0,
          'IN_PROGRESS': data.inProgress || 0,
          'ESCALATED': data.escalated || 0,
          'RESOLVED': data.resolved || 0,
          'CLOSED': data.closed || 0
        };
        // Calcul du total pour les pourcentages des barres
        this.totalTickets = Object.values(this.statusDistribution).reduce((a: number, b: number) => a + b, 0);
      });
    } else {
      this.ticketService.getTeamKpis().subscribe((data: TeamKpis) => {
        this.teamKpis = data;
      });
      this.ticketService.getAgentWorkload().subscribe((data: AgentWorkload[]) => {
        this.agentWorkload = data;
      });
    }
  }

  switchTab(tab: 'org' | 'team') {
    this.activeTab = tab;
    this.loadData();
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'OPEN': 'bg-blue-500',
      'IN_PROGRESS': 'bg-orange-500',
      'ESCALATED': 'bg-red-500',
      'RESOLVED': 'bg-green-500',
      'CLOSED': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-400';
  }
}