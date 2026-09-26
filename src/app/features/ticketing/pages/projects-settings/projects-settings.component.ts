import { Component, OnInit } from '@angular/core';
import { TicketConfigService, Project } from '../../services/ticket-config.service';

@Component({
  selector: 'app-projects-settings',
  templateUrl: './projects-settings.component.html',
  styleUrls: ['./projects-settings.component.scss']
})
export class ProjectsSettingsComponent implements OnInit {
  projects: Project[] = [];
  newProjectName: string = '';
  newProjectCode: string = '';

  constructor(private service: TicketConfigService) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.service.getProjects().subscribe({
      next: (data) => this.projects = data,
      error: (err) => console.error('Error loading projects:', err)
    });
  }

  createProject() {
    if (!this.newProjectName.trim()) return;
    
    const project: Project = {
      id: 0,
      name: this.newProjectName,
      code: this.newProjectCode || undefined
    };

    this.service.createProject(project).subscribe({
      next: () => {
        this.newProjectName = '';
        this.newProjectCode = '';
        this.loadProjects();
      },
      error: (err) => console.error('Error creating project:', err)
    });
  }

  deleteProject(id: number) {
    if (confirm('Are you sure you want to delete this project?')) {
      this.service.deleteProject(id).subscribe({
        next: () => this.loadProjects(),
        error: (err) => console.error('Error deleting project:', err)
      });
    }
  }
}