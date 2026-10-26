import { ForecastGridCell } from './forecast-grid-cell.model';

export interface ScheduleTaskOption {
  wbsCode: string;
  name: string;
  outlineLevel: number;
  plannedHours: number;
}

export interface ForecastRow {
  financeEntryId: number;
  parentId?: number | null;
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

  // ✅ NOUVEAUX CHAMPS pour la liaison manuelle Schedule
  linkedScheduleWbs?: string | null;
  availableScheduleTasks?: ScheduleTaskOption[];
  
  periods: ForecastGridCell[];

  // Calculated by the backend: leaf flag, cost rate of HOUR leaves and remaining forecast cost in money
  leaf?: boolean;
  hourRate?: number | null;
  remainingForecastCost?: number;
}
