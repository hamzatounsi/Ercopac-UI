import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmDashboardService } from '../../../services/gm-dashboard.service';
import { ProjectDetails } from '../../../models/project-details.model';
import { GmAiAssistantService } from '../../../services/gm-ai-assistant.service';
import { AiPdfExportService } from '../../../services/ai-pdf-export.service';
import { I18nService } from 'src/app/core/i18n/i18n.service';

@Component({
  selector: 'app-gm-project-details',
  templateUrl: './gm-project-details.component.html',
  styleUrls: ['./gm-project-details.component.scss']
})
export class GmProjectDetailsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  project: ProjectDetails | null = null;
  aiQuestion = '';
  aiAnswer = '';
  aiLoading = false;
  aiError = '';
  aiLastQuestion = '';
  aiUpdatedAt: Date | null = null;
  aiOpen = false;
  aiGeneratePdf = false;

  constructor(private readonly i18n: I18nService, 
    private route: ActivatedRoute,
    private router: Router,
    private gmService: GmDashboardService,
    private aiService: GmAiAssistantService,
    private aiPdf: AiPdfExportService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = this.i18n.t('gm.projectDetails.invalidProjectId');
      return;
    }

    this.loading = true;
    this.error = null;

    this.gmService.getProjectById(id).subscribe({
      next: (p) => {
        this.project = p;
      },
      error: (err) => {
        this.error = this.i18n.error(err, 'gm.projectDetails.failedLoadProject');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/gm/projectum']);
  }

  askAi(question?: string): void {
    if (this.aiLoading) return;
    const finalQuestion = (question || this.aiQuestion).trim();

    if (!this.project?.id || !finalQuestion.trim()) {
      return;
    }

    this.aiLoading = true;
    this.aiError = '';
    this.aiAnswer = '';
    this.aiLastQuestion = finalQuestion;

    this.aiService.streamProjectAssistant(this.project.id, finalQuestion).subscribe({
      next: (answer) => { this.aiAnswer = answer; },
      complete: () => {
        if (!this.aiAnswer.trim()) this.aiError = this.i18n.t('gm.projectDetails.assistantReturnedEmptyResponse');
        this.aiUpdatedAt = new Date();
        this.aiLoading = false;
        if (this.aiAnswer.trim() && this.aiGeneratePdf) this.downloadAiPdf();
      },
      error: (err) => {
        this.aiError = err?.message || this.i18n.t('gm.projectDetails.assistantUnavailable');
        this.aiLoading = false;
      }
    });
  }

  onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.askAi(); }
  }

  retryAi(): void { if (this.aiLastQuestion) this.askAi(this.aiLastQuestion); }

  clearAi(): void { this.aiQuestion = ''; this.aiAnswer = ''; this.aiError = ''; this.aiLastQuestion = ''; this.aiUpdatedAt = null; }

  copyAiAnswer(): void { if (this.aiAnswer && navigator.clipboard) navigator.clipboard.writeText(this.aiAnswer); }

  downloadAiPdf(): void {
    if (this.project && this.aiAnswer.trim()) {
      void this.aiPdf.download(this.project.name, this.aiLastQuestion, this.aiAnswer)
        .catch(() => { this.aiError = this.i18n.t('gm.projectDetails.answerReadyButPdf'); });
    }
  }

  formatCurrency(value?: number): string {
    if (value === null || value === undefined) {
      return '-';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }
}
