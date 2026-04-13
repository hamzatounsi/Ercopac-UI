export interface DepartmentHoliday {
  id: number;
  memberId: number;
  memberName: string;
  fromDate: string;
  toDate: string;
  note: string | null;
}