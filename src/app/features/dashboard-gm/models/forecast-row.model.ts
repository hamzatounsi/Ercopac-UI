import { ForecastGridCell } from './forecast-grid-cell.model';

export interface ForecastRow {
  financeEntryId: number; // ✅ AJOUTÉ : Pour l'update du level
  wbsCode: string;
  description: string;
  level: number;
  rowType: string;
  budget: number;
  actualCost: number;
  totalForecast: number;
  
  // ✅ AJOUTÉS : Pour le calcul automatique du Remaining Cost
  resourceTypeCode?: string;
  remainingHours?: number;
  remainingCost?: number;
  
  periods: ForecastGridCell[];
}