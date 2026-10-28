import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { NotificationService } from 'src/app/features/dashboard-gm/services/notification.service';
import { AppNotification } from 'src/app/features/dashboard-gm/models/notification.model';

// Bell in the Ticketing header: ticket alerts (assignment, L2 escalation, new messages, status changes).
// Uses the shared /api/notifications endpoints and keeps only notifications that link to a ticket.
@Component({
  selector: 'app-ticket-notifications',
  templateUrl: './ticket-notifications.component.html',
  styleUrls: ['./ticket-notifications.component.scss']
})
export class TicketNotificationsComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  open = false;
  error = false;
  private poll?: Subscription;

  constructor(private api: NotificationService, private router: Router) {}

  ngOnInit(): void {
    this.poll = interval(60_000).pipe(startWith(0)).subscribe(() => this.load());
  }

  ngOnDestroy(): void { this.poll?.unsubscribe(); }

  get unread(): number { return this.notifications.filter(n => !n.readByUser).length; }

  load(): void {
    this.api.getMyNotifications().subscribe({
      next: list => { this.notifications = (list ?? []).filter(n => n.link?.startsWith('/tickets')).slice(0, 30); this.error = false; },
      error: () => this.error = true
    });
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.load();
  }

  select(n: AppNotification): void {
    if (!n.readByUser) this.api.markAsRead(n.id).subscribe({ next: () => n.readByUser = true });
    this.open = false;
    if (n.link) void this.router.navigateByUrl(n.link);
  }

  markAllRead(): void {
    this.api.markAllAsRead().subscribe({ next: () => this.notifications.forEach(n => n.readByUser = true) });
  }

  @HostListener('document:click', ['$event'])
  close(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.tk-bell')) this.open = false;
  }
}
