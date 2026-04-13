export interface OwnerOrganisationSummary {
  organisationId: number;
  organisationName: string;
  usersCount: number;
  projectsCount: number;
  activeProjects: number;
  delayedProjects: number;
  criticalProjects: number;
  overallHealth: 'GREEN' | 'AMBER' | 'RED';
}