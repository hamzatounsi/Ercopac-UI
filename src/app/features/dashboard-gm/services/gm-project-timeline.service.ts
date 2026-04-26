import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GmProjectScheduleTask } from '../models/gm-project-schedule-task.model';
import { GmUpdateProjectTaskRequest } from '../models/gm-update-project-task-request.model';
import { TaskResourceAssignment } from '../models/task-resource-assignment.model';
import { API_PROJECTS_URL, API_TASKS_URL } from 'src/app/core/config/api.config';

@Injectable({ providedIn: 'root' })
export class GmProjectTimelineService {
  constructor(private http: HttpClient) {}

  getProjectSchedule(projectId: number): Observable<GmProjectScheduleTask[]> {
    return this.http.get<GmProjectScheduleTask[]>(`${API_PROJECTS_URL}/${projectId}/schedule`);
  }

  updateTask(taskId: number, payload: GmUpdateProjectTaskRequest): Observable<GmProjectScheduleTask> {
    return this.http.put<GmProjectScheduleTask>(`${API_TASKS_URL}/${taskId}`, payload);
  }

  insertTaskBelow(projectId: number, afterTaskId: number, payload: any): Observable<GmProjectScheduleTask> {
    return this.http.post<GmProjectScheduleTask>(
      `${API_PROJECTS_URL}/${projectId}/tasks/below/${afterTaskId}`,
      payload
    );
  }

  copyTaskBelow(projectId: number, taskId: number): Observable<GmProjectScheduleTask> {
    return this.http.post<GmProjectScheduleTask>(
      `${API_PROJECTS_URL}/${projectId}/tasks/copy/${taskId}`,
      {}
    );
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${API_TASKS_URL}/${taskId}`);
  }

  createDependency(projectId: number, payload: any): Observable<any> {
    return this.http.post(`${API_PROJECTS_URL}/${projectId}/dependencies`, payload);
  }

  updateDependency(projectId: number, dependencyId: number, payload: any): Observable<any> {
    return this.http.put(`${API_PROJECTS_URL}/${projectId}/dependencies/${dependencyId}`, payload);
  }

  deleteDependency(projectId: number, dependencyId: number): Observable<void> {
    return this.http.delete<void>(`${API_PROJECTS_URL}/${projectId}/dependencies/${dependencyId}`);
  }

  getTaskResources(projectId: number, taskId: number): Observable<TaskResourceAssignment[]> {
    return this.http.get<TaskResourceAssignment[]>(`${API_PROJECTS_URL}/${projectId}/tasks/${taskId}/resources`);
  }

  createTaskResource(projectId: number, taskId: number, payload: TaskResourceAssignment): Observable<TaskResourceAssignment> {
    return this.http.post<TaskResourceAssignment>(`${API_PROJECTS_URL}/${projectId}/tasks/${taskId}/resources`, payload);
  }

  updateTaskResource(projectId: number, taskId: number, assignmentId: number, payload: TaskResourceAssignment): Observable<TaskResourceAssignment> {
    return this.http.put<TaskResourceAssignment>(`${API_PROJECTS_URL}/${projectId}/tasks/${taskId}/resources/${assignmentId}`, payload);
  }

  deleteTaskResource(projectId: number, taskId: number, assignmentId: number): Observable<void> {
    return this.http.delete<void>(`${API_PROJECTS_URL}/${projectId}/tasks/${taskId}/resources/${assignmentId}`);
  }

  createAction(projectId: number, payload: any): Observable<any> {
    return this.http.post(`${API_PROJECTS_URL}/${projectId}/actions`, payload);
  }

  getActionsSummary(projectId: number): Observable<any> {
    return this.http.get(`${API_PROJECTS_URL}/${projectId}/actions/summary`);
  }
}