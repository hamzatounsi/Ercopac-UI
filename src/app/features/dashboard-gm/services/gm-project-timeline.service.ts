import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GmProjectScheduleTask } from '../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../models/gm-update-project-task-request.model';
import { TaskResourceAssignment } from '../models/task-resource-assignment.model';

@Injectable({ providedIn: 'root' })
export class GmProjectTimelineService {
  constructor(private http: HttpClient) {}

  getProjectSchedule(projectId: number): Observable<GmProjectScheduleTask[]> {
    return this.http.get<GmProjectScheduleTask[]>(`/api/projects/${projectId}/schedule`);
  }

  updateTask(taskId: number, payload: GmUpdateProjectTaskRequest): Observable<GmProjectScheduleTask> {
    return this.http.put<GmProjectScheduleTask>(`/api/tasks/${taskId}`, payload);
  }

  createDependency(projectId: number, payload: any): Observable<any> {
  return this.http.post(`/api/projects/${projectId}/dependencies`, payload);
  }

  updateDependency(projectId: number, dependencyId: number, payload: any): Observable<any> {
    return this.http.put(`/api/projects/${projectId}/dependencies/${dependencyId}`, payload);
  }

  deleteDependency(projectId: number, dependencyId: number): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/dependencies/${dependencyId}`);
  }

  getTaskResources(projectId: number, taskId: number): Observable<TaskResourceAssignment[]> {
  return this.http.get<TaskResourceAssignment[]>(`/api/projects/${projectId}/tasks/${taskId}/resources`);
  }

  createTaskResource(projectId: number, taskId: number, payload: TaskResourceAssignment): Observable<TaskResourceAssignment> {
    return this.http.post<TaskResourceAssignment>(`/api/projects/${projectId}/tasks/${taskId}/resources`, payload);
  }

  updateTaskResource(projectId: number, taskId: number, assignmentId: number, payload: TaskResourceAssignment): Observable<TaskResourceAssignment> {
    return this.http.put<TaskResourceAssignment>(`/api/projects/${projectId}/tasks/${taskId}/resources/${assignmentId}`, payload);
  }

  deleteTaskResource(projectId: number, taskId: number, assignmentId: number): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/tasks/${taskId}/resources/${assignmentId}`);
  }
}