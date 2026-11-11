import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from 'src/app/core/i18n/i18n.service';
import { Breakdown, ClientDashboard, Ticket } from '../../models/ticket.models';
import { TicketService } from '../../services/ticket.service';
import { TicketSettingsService } from '../../services/ticket-settings.service';

// Client portal dashboard: statistics of the client's own tickets. The backend only counts tickets of the
// current client in the current organisation (GET /api/tickets/my-dashboard), not just the UI.
@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  data?: ClientDashboard;
  loading = true;
  error = '';

  constructor(private api: TicketService, public labels: TicketSettingsService, private i18n: I18nService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.myDashboard().subscribe({
      next: d => { this.data = d; this.loading = false; },
      error: e => { this.error = this.i18n.error(e, 'ticketing.clientDashboard.couldNotLoad'); this.loading = false; }
    });
  }

  /** Bar size in % of the largest value of a breakdown. */
  width(item: Breakdown, all: Breakdown[]): number {
    const max = Math.max(1, ...all.map(b => b.count));
    return Math.round(item.count / max * 100);
  }

  monthLabel(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  open(t: Ticket): void { void this.router.navigate(['/tickets', t.id]); }
}
