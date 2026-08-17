import { ForecastGridCell } from './forecast-grid-cell.model';

export interface ScheduleTaskOption {
  wbsCode: string;
  name: string;
  outlineLevel: number;
  plannedHours: number;
}

export interface ForecastRow {
  financeEntryId: number;
  wbsCode: string;
  description: string;
  level: number;
  rowType: string;
  budget: number;
  actualCost: number;
  totalForecast: number;
  
  resourceTypeCode?: string;
  remainingHours?: number;
  remainingCost?: number;

  // ✅ AJOUTER CES DEUX LIGNES :
  linkedScheduleWbs?: string | null;
  availableScheduleTasks?: ScheduleTaskOption[];
  
  periods: ForecastGridCell[];
}