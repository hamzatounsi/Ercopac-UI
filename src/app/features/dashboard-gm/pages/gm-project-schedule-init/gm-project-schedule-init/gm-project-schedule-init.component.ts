import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectScheduleInitRequest } from '../../../models/project-schedule-init.model';

import { GmProjectScheduleService } from '../../../services/gm-project-schedule.service';
import { InitializedProjectResponse } from '../../../models/initialized-project-response.model';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-gm-project-schedule-init',
  templateUrl: './gm-project-schedule-init.component.html',
  styleUrls: ['./gm-project-schedule-init.component.scss']
})
export class GmProjectScheduleInitComponent implements OnInit {
  scheduleForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  priorities = ['P1', 'P2', 'P3', 'P4'];
  countries = ['Tunisia', 'Germany', 'France', 'Italy'];
  projectTypes = ['Industrial', 'Maintenance', 'Transformation', 'Infrastructure'];
  projectPhases = ['Initiation', 'Design', 'Execution', 'Closure'];
  portfolios = ['Packaging', 'Production', 'Operations', 'Digitalization'];

  constructor(private readonly i18n: I18nService, 
    private fb: FormBuilder,
    private gmProjectScheduleService: GmProjectScheduleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.scheduleForm = this.fb.group({
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      shortName: [''],
      portfolio: [''],
      orgAssignment: ['General Management'],
      country: [''],
      projectType: [''],
      projectPhase: ['Initiation'],
      priority: ['P2'],
      plannedStart: ['', [Validators.required]],
      plannedEnd: ['', [Validators.required]],
      expectedStart: [''],
      expectedEnd: [''],
      projectCalendar: ['Standard Calendar'],
      probability: [100],
      projectBudget: [null],
      totalProjectBudget: [null],
      projectManagerId: [null],
      keywords: [''],
      subcontractors: [''],
      comment: ['']
    });
  }

  submit(): void {
    this.errorMessage = '';

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const formValue = this.scheduleForm.value;

    if (formValue.plannedStart && formValue.plannedEnd && formValue.plannedEnd < formValue.plannedStart) {
      this.errorMessage = this.i18n.t('gm.scheduleInit.plannedEndDateCannot');
      return;
    }

    if (formValue.expectedStart && formValue.expectedEnd && formValue.expectedEnd < formValue.expectedStart) {
      this.errorMessage = this.i18n.t('gm.scheduleInit.expectedEndDateCannot');
      return;
    }

    if (formValue.probability !== null && formValue.probability !== undefined) {
      if (formValue.probability < 0 || formValue.probability > 100) {
        this.errorMessage = this.i18n.t('gm.scheduleInit.probabilityMustBetween0');
        return;
      }
    }

    this.isSubmitting = true;

    const payload: ProjectScheduleInitRequest = {
      ...formValue
    };

    this.gmProjectScheduleService.initializeProjectSchedule(payload).subscribe({
      next: (response: InitializedProjectResponse) => {
        this.isSubmitting = false;
        this.router.navigate(['/gm/projects', response.projectId]);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.errorMessage =
          this.i18n.error(error, 'gm.scheduleInit.failedInitializeProjectSchedule');
      }
    });
  }

  resetForm(): void {
    this.scheduleForm.reset({
      orgAssignment: 'General Management',
      projectPhase: 'Initiation',
      priority: 'P2',
      projectCalendar: 'Standard Calendar',
      probability: 100
    });
    this.errorMessage = '';
  }

  hasError(controlName: string): boolean {
    const control = this.scheduleForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}