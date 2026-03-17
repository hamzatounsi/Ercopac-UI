import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GmProjectScheduleTask } from '../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../models/gm-update-project-task-request.model';

@Injectable({
  providedIn: 'root'
})
export class GmProjectTimelineService {
  constructor(private http: HttpClient) {}

  getProjectSchedule(projectId: number): Observable<GmProjectScheduleTask[]> {
    return this.http.get<GmProjectScheduleTask[]>(`/api/projects/${projectId}/schedule`);
  }

  updateTask(taskId: number, payload: GmUpdateProjectTaskRequest): Observable<GmProjectScheduleTask> {
    return this.http.put<GmProjectScheduleTask>(`/api/tasks/${taskId}`, payload);
  }
}