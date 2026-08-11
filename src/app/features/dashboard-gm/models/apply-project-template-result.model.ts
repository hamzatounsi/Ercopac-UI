export interface ApplyProjectTemplateResult {
  templateId: number;
  templateName: string;
  tasksCreated: number;
  dependenciesCreated: number;
  alreadyApplied: boolean;
}
