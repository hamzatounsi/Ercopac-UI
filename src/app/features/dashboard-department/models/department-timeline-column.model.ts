export interface DepartmentTimelineColumn {
  startDate: string;
  endDate: string;
  label: string;
  subLabel: string | null;
  weekend: boolean;
  today: boolean;
}