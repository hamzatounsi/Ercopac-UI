import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MilestoneService, ProjectMilestone } from '../../services/milestone.service';
import { GmDashboardService } from '../../services/gm-dashboard.service';

interface TimelineDay {
  date: Date;
  label: string;
  isMonthStart: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

interface TimelineMonth {
  label: string;
  width: number;
}

@Component({
  selector: 'app-milestone-dashboard',
  templateUrl: './milestone-dashboard.component.html',
  styleUrls: ['./milestone-dashboard.component.scss']
})
export class MilestoneDashboardComponent implements OnInit {
  @ViewChild('timelineBodyScroll') timelineBodyScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineHeaderScroll') timelineHeaderScroll!: ElementRef<HTMLDivElement>;

  projects: any[] = [];
  milestones: ProjectMilestone[] = [];
  
  // ✅ NOUVEAU : Map pour stocker les milestones groupés par projet (évite la boucle infinie)
  milestonesByProject = new Map<number | string, ProjectMilestone[]>();
  
  timelineDays: TimelineDay[] = [];
  timelineMonths: TimelineMonth[] = [];
  dayWidth = 30;
  loading = false;
  startDate!: Date;
  endDate!: Date;

  statusFilter = 'ALL';
  pmFilter = 'ALL';
  statusMenuOpen = false;
  pmMenuOpen = false;

  constructor(
    private milestoneService: MilestoneService,
    private dashboardService: GmDashboardService
  ) {}

  ngOnInit(): void {
    this.buildDateRange();
    this.loadData();
  }

  private buildDateRange(): void {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    this.endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0);
    this.buildTimeline();
  }

  private buildTimeline(): void {
    const days: TimelineDay[] = [];
    const cursor = new Date(this.startDate);
    
    while (cursor <= this.endDate) {
      const dayOfWeek = cursor.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push({
        date: new Date(cursor),
        label: cursor.getDate().toString().padStart(2, '0'),
        isMonthStart: cursor.getDate() === 1,
        isWeekend,
        isHoliday: this.isHoliday(cursor),
        holidayName: this.getHolidayName(cursor)
      });
      
      cursor.setDate(cursor.getDate() + 1);
    }
    
    this.timelineDays = days;
    this.buildMonths();
  }

  private buildMonths(): void {
    const months: TimelineMonth[] = [];
    let currentMonth = '';
    let currentLabel = '';
    let currentCount = 0;
    
    this.timelineDays.forEach((day, index) => {
      const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      const label = day.date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();
      
      if (monthKey !== currentMonth) {
        if (currentCount > 0) {
          months.push({ label: currentLabel, width: currentCount * this.dayWidth });
        }
        currentMonth = monthKey;
        currentLabel = label;
        currentCount = 1;
      } else {
        currentCount++;
      }
      
      if (index === this.timelineDays.length - 1) {
        months.push({ label: currentLabel, width: currentCount * this.dayWidth });
      }
    });
    
    this.timelineMonths = months;
  }

  private isHoliday(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    return (month === 4 && day === 1) || (month === 11 && day === 25);
  }

  private getHolidayName(date: Date): string | undefined {
    const month = date.getMonth();
    const day = date.getDate();
    if (month === 4 && day === 1) return 'Labour Day';
    if (month === 11 && day === 25) return 'Christmas';
    return undefined;
  }

loadData(): void {
  console.log('🚀 [DEBUG] loadData() appelé. Chargement des projets...');
  this.loading = true;
  this.dashboardService.getProjects().subscribe({
    next: (projects) => {
      console.log('✅ [DEBUG] Projets reçus du backend:', projects);
      this.projects = projects ?? [];
      console.log('📊 [DEBUG] Nombre de projets chargés:', this.projects.length);
      
      // ✅ AJOUTEZ CETTE LIGNE POUR DEBUG:
      console.log('🔍 [DEBUG] Premier projet:', this.projects[0]);
      
      this.loadAllMilestones();
    },
    error: (err) => {
      console.error(' [DEBUG] Échec du chargement des projets:', err);
      this.loading = false;
    }
  });
}

  loadAllMilestones(): void {
    if (this.projects.length === 0) {
      this.loading = false;
      return;
    }
    
    const projectIds = this.projects.map(p => p.id);
    const startDateStr = this.formatDate(this.startDate);
    const endDateStr = this.formatDate(this.endDate);
    
    this.milestoneService.getMilestonesByDateRange(projectIds, startDateStr, endDateStr).subscribe({
      next: (milestones) => {
        this.milestones = milestones;
        this.groupMilestonesByProject(); // ✅ APPEL DE LA NOUVELLE MÉTHODE
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Échec du chargement des milestones:', err);
        this.loading = false;
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE : Pré-calcule les milestones par projet (exécuté 1 seule fois)
  private groupMilestonesByProject(): void {
    this.milestonesByProject.clear();
    this.milestones.forEach(m => {
      const pid = m.projectId;
      if (!this.milestonesByProject.has(pid)) {
        this.milestonesByProject.set(pid, []);
      }
      this.milestonesByProject.get(pid)!.push(m);
    });
    console.log('✅ Milestones groupés par projet avec succès.');
  }

  formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getMilestoneLeft(milestone: ProjectMilestone): number {
    if (!milestone.milestoneDate) return -100;
    
    const dateStr = milestone.milestoneDate.length === 10 ? milestone.milestoneDate + 'T00:00:00' : milestone.milestoneDate;
    const date = new Date(dateStr);
    
    const dayIndex = this.timelineDays.findIndex(d => 
      d.date.getFullYear() === date.getFullYear() &&
      d.date.getMonth() === date.getMonth() &&
      d.date.getDate() === date.getDate()
    );
    
    if (dayIndex === -1) return -100;
    
    return dayIndex * this.dayWidth + (this.dayWidth / 2);
  }

  getRowHeight(): number {
    return 32;
  }

  get uniqueStatuses(): string[] {
    const statuses = this.projects.map(p => p.projectPhase || 'A');
    return ['ALL', ...Array.from(new Set(statuses))].sort();
  }

  get uniquePMs(): string[] {
    const pms = this.projects.map(p => p.projectManagerName || '—');
    return ['ALL', ...Array.from(new Set(pms))].sort();
  }
get filteredProjects(): any[] {
  const filtered = this.projects.filter(project => {
    const statusMatch = this.statusFilter === 'ALL' || (project.projectPhase || 'A') === this.statusFilter;
    const pmMatch = this.pmFilter === 'ALL' || (project.projectManagerName || '—') === this.pmFilter;
    return statusMatch && pmMatch;
  });
  
  // ✅ AJOUTEZ CETTE LIGNE POUR DEBUG:
  console.log('📋 [DEBUG] filteredProjects:', filtered.length, 'projets affichés');
  console.log(' [DEBUG] Premier projet filtré:', filtered[0]);
  
  return filtered;
}

  toggleStatusMenu(): void { 
    this.statusMenuOpen = !this.statusMenuOpen; 
    this.pmMenuOpen = false; 
  }

  togglePMMenu(): void { 
    this.pmMenuOpen = !this.pmMenuOpen; 
    this.statusMenuOpen = false; 
  }

  setStatusFilter(status: string): void { 
    this.statusFilter = status; 
    this.statusMenuOpen = false; 
  }

  setPMFilter(pm: string): void { 
    this.pmFilter = pm; 
    this.pmMenuOpen = false; 
  }

  getPMInitials(project: any): string {
    const name = project.projectManagerName;
    if (!name || name.trim() === '') return '—';

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    } else if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return '—';
  }

  onTimelineScroll(): void {
    const timelineBodyEl = this.timelineBodyScroll?.nativeElement;
    const timelineHeaderEl = this.timelineHeaderScroll?.nativeElement;
    
    if (timelineBodyEl && timelineHeaderEl) {
      timelineHeaderEl.scrollLeft = timelineBodyEl.scrollLeft;
    }
  }
}