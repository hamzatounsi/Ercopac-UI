import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GmDashboardService } from '../../../services/gm-dashboard.service';
import { ProjectDetails } from '../../../models/project-details.model';
import { GmAiAssistantService } from '../../../services/gm-ai-assistant.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gmService: GmDashboardService,
    private aiService: GmAiAssistantService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid project id';
      return;
    }

    this.loading = true;
    this.error = null;

    this.gmService.getProjectById(id).subscribe({
      next: (p) => {
        this.project = p;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load project';
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
    this.aiLastQuestion = finalQuestion;

    this.aiService.askProjectAssistant(this.project.id, finalQuestion).subscribe({
      next: (res) => {
        this.aiAnswer = (res.answer || '').trim() || 'The assistant returned an empty response. Please try again.';
        this.aiUpdatedAt = new Date();
        this.aiLoading = false;
      },
      error: (err) => {
        const status = err?.status;
        this.aiError = status === 408 || status === 504
          ? 'The AI request timed out. Try a shorter question or retry shortly.'
          : status === 503
            ? 'Ollama is currently unavailable. Start the local AI service and try again.'
            : status === 401 || status === 403
              ? 'You are not authorised to use the assistant for this project.'
              : 'The AI assistant is unavailable right now. Please retry.';
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
