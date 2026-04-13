import { DepartmentManager } from './department-manager.model';
import { DepartmentMember } from './department-member.model';
import { DepartmentHoliday } from './department-holiday.model';
import { DepartmentTimelineColumn } from './department-timeline-column.model';
import { DepartmentResourceRow } from './department-resource-row.model';
import { DepartmentProjectBlock } from './department-project-block.model';
import { DepartmentWeeklyStat } from './department-weekly-stat.model';

export interface DepartmentOverview {
  selectedManager: DepartmentManager;
  selectedDepartmentCode: string;
  members: DepartmentMember[];
  holidays: DepartmentHoliday[];
  timelineColumns: DepartmentTimelineColumn[];
  resourceRows: DepartmentResourceRow[];
  projectBlocks: DepartmentProjectBlock[];
  weeklyStats: DepartmentWeeklyStat[];
}