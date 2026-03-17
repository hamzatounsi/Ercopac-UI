import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GmTask } from '../../../models/gm-task.model';
import { GmTaskService } from '../../../services/gm-task.service';


@Component({
  selector: 'app-gm-project-tasks',
  templateUrl: './gm-project-tasks.component.html',
  styleUrls: ['./gm-project-tasks.component.scss']
})
export class GmProjectTasksComponent implements OnInit {
  projectId!: number;
  tasks: GmTask[] = [];
  loading = false;
  error = '';
  showCreateForm = false;
  isSubmitting = false;

  taskForm!: FormGroup;

  scheduleModes = ['AUTO', 'MANUAL'];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private gmTaskService: GmTaskService
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.initForm();
    this.loadTasks();
  }

  initForm(): void {
    this.taskForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      durationDays: [1, [Validators.min(1)]],
      plannedStart: [''],
      plannedEnd: [''],
      percentComplete: [0, [Validators.min(0), Validators.max(100)]],
      priority: [500, [Validators.min(0), Validators.max(1000)]],
      scheduleMode: ['AUTO'],
      active: [true],
      displayOrder: [null]
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';

    this.gmTaskService.getTasksByProject(this.projectId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load tasks.';
        this.loading = false;
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
  }

  createTask(): void {
    this.error = '';

    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const value = this.taskForm.value;

    if (value.plannedStart && value.plannedEnd && value.plannedEnd < value.plannedStart) {
      this.error = 'Task planned end date cannot be before planned start date.';
      return;
    }

    this.isSubmitting = true;

    this.gmTaskService.createTask(this.projectId, value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showCreateForm = false;
        this.taskForm.reset({
          durationDays: 1,
          percentComplete: 0,
          priority: 500,
          scheduleMode: 'AUTO',
          active: true,
          displayOrder: null
        });
        this.loadTasks();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to create task.';
        this.isSubmitting = false;
      }
    });
  }

  trackByTaskId(index: number, task: GmTask): number {
    return task.id;
  }

  hasError(controlName: string): boolean {
    const control = this.taskForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}