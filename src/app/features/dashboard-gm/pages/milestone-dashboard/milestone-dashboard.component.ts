import { Component, OnInit } from '@angular/core';
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
  projects: any[] = []; // Utilisé comme 'any' pour éviter les erreurs TS si le modèle n'est pas encore mis à jour
  milestones: ProjectMilestone[] = [];
  timelineDays: TimelineDay[] = [];
  timelineMonths: TimelineMonth[] = [];
  dayWidth = 30;
  loading = false;
  startDate!: Date;
  endDate!: Date;

  // Editable dropdown properties
  statusOptions = ['A', 'C', 'CCR', 'CLOSED', 'COMPLETED', 'ON_HOLD'];
  
  // ✅ MODIFIÉ : Options de département (ajuste les codes selon ton entreprise)
  departmentOptions = ['ALL', 'PRC', 'ENG', 'QA', 'MGT', '—']; 
  
  savingProjectId: number | null = null;

  // Filter properties
  statusFilter = 'ALL';
  departmentFilter = 'ALL'; // ✅ MODIFIÉ : était pmFilter
  statusMenuOpen = false;
  departmentMenuOpen = false; // ✅ MODIFIÉ : était pmMenuOpen

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
  this.loading = true;
  
  this.dashboardService.getProjects().subscribe({
    next: (projects) => {
      console.log('📊 PROJETS REÇUS DU BACKEND:', projects); // ✅ DEBUG
      console.log('📊 Premier projet:', projects[0]); // ✅ DEBUG
      this.projects = projects ?? [];
      this.loadAllMilestones();
    },
    error: (err) => {
      console.error('Failed to load projects', err);
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
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load milestones', err);
        this.loading = false;
      }
    });
  }

  formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getMilestoneLeft(milestone: ProjectMilestone): number {
    if (!milestone.milestoneDate) return -100;
    
    const date = new Date(milestone.milestoneDate);
    const dayIndex = this.timelineDays.findIndex(d => 
      d.date.toDateString() === date.toDateString()
    );
    
    if (dayIndex === -1) return -100;
    
    return dayIndex * this.dayWidth + (this.dayWidth / 2);
  }

  getMilestonesForProject(projectId: number): ProjectMilestone[] {
    return this.milestones.filter(m => m.projectId === projectId);
  }

  getRowHeight(): number {
    return 32;
  }

  // ================= FILTER METHODS =================

    get uniqueStatuses(): string[] {
    // ✅ Utilise projectPhase au lieu de status
    const statuses = this.projects.map(p => p.projectPhase || 'A');
    return ['ALL', ...Array.from(new Set(statuses))].sort();
  }
  
  
   get uniqueDepartments(): string[] {
    const deps = this.projects.map(p => p.pmDepartmentCode || '—');
    return ['ALL', ...Array.from(new Set(deps))].sort();
  }
  get filteredProjects(): any[] {
    return this.projects.filter(project => {
      // ✅ Utilise projectPhase
      const statusMatch = this.statusFilter === 'ALL' || (project.projectPhase || 'A') === this.statusFilter;
      const projectDept = project.pmDepartmentCode || '—'; 
      const deptMatch = this.departmentFilter === 'ALL' || projectDept === this.departmentFilter;
      return statusMatch && deptMatch;
    });
  }
  
  toggleStatusMenu(): void { 
    this.statusMenuOpen = !this.statusMenuOpen; 
    this.departmentMenuOpen = false; 
  }
  
  // ✅ MODIFIÉ : toggleDepartmentMenu au lieu de togglePMMenu
  toggleDepartmentMenu(): void { 
    this.departmentMenuOpen = !this.departmentMenuOpen; 
    this.statusMenuOpen = false; 
  }
  
  setStatusFilter(status: string): void { 
    this.statusFilter = status; 
    this.statusMenuOpen = false; 
  }
  
  // ✅ MODIFIÉ : setDepartmentFilter au lieu de setPMFilter
  setDepartmentFilter(dept: string): void { 
    this.departmentFilter = dept; 
    this.departmentMenuOpen = false; 
  }

  // ================= EDITABLE DROPDOWN METHODS =================

  onProjectStatusChange(project: any, newStatus: string): void {
    this.savingProjectId = project.id;
    this.dashboardService.updateProject(project.id, { status: newStatus } as any).subscribe({
      next: () => {
        project.status = newStatus;
        this.savingProjectId = null;
      },
      error: (err) => {
        console.error('Failed to update project status', err);
        this.savingProjectId = null;
        alert('Failed to update status. Please try again.');
      }
    });
  }

  // ✅ MODIFIÉ : Met à jour le département au lieu du PM
  onProjectDepartmentChange(project: any, newDept: string): void {
    this.savingProjectId = project.id;
    this.dashboardService.updateProject(project.id, { 
      departmentCode: newDept === '—' ? null : newDept 
    } as any).subscribe({
      next: () => {
        project.departmentCode = newDept === '—' ? null : newDept;
        this.savingProjectId = null;
      },
      error: (err) => {
        console.error('Failed to update project department', err);
        this.savingProjectId = null;
        alert('Failed to update department. Please try again.');
      }
    });
  }
  
}