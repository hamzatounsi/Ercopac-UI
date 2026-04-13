import { ForecastGridCell } from './forecast-grid-cell.model';

export interface ForecastRow {
  wbsCode: string;
  description: string;
  level: number;
  budget: number;
  actualCost: number;
  totalForecast: number;
  periods: ForecastGridCell[];
}