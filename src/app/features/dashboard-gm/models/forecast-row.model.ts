import { ForecastGridCell } from './forecast-grid-cell.model';

export interface ForecastRow {
  wbsCode: string;
  description: string;
  level: number;
  rowType: string;
  budget: number;
  actualCost: number;
  totalForecast: number;
  periods: ForecastGridCell[];
}