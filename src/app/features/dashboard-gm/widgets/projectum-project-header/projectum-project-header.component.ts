import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-projectum-project-header',
  templateUrl: './projectum-project-header.component.html',
  styleUrls: ['./projectum-project-header.component.scss']
})
export class ProjectumProjectHeaderComponent implements OnInit {

  @Input() projectId!: number;
  @Input() activeMode: 'baseline' | 'actual' = 'baseline';

  @Output() modeChange = new EventEmitter<'baseline' | 'actual'>();
  @Output() refresh = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();

  notifications: AppNotification[] = [];
  bellOpen = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getMyNotifications().subscribe({
      next: (list) => { this.notifications = list ?? []; },
      error: () => { this.notifications = []; }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.readByUser).length;
  }

  toggleBell(): void {
    this.bellOpen = !this.bellOpen;
  }

  openNotification(n: AppNotification): void {
    if (!n.readByUser) {
      this.notificationService.markAsRead(n.id).subscribe({
        next: () => { n.readByUser = true; },
        error: () => {}
      });
    }
    this.bellOpen = false;
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => { this.notifications.forEach(n => n.readByUser = true); },
      error: () => {}
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.hdr-bell-wrap')) {
      this.bellOpen = false;
    }
  }

  setMode(mode: 'baseline' | 'actual'): void {
    this.modeChange.emit(mode);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onSettings(): void {
    this.settings.emit();
  }
}