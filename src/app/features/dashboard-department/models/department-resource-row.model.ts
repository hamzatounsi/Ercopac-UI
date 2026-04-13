import { DepartmentMember } from './department-member.model';
import { DepartmentTimelineItem } from './department-timeline-item.model';

export interface DepartmentResourceRow {
  member: DepartmentMember;
  items: DepartmentTimelineItem[];
}