import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateGmTaskRequest, GmTask, UpdateGmTaskRequest } from '../models/gm-task.model';

@Injectable({
  providedIn: 'root'
})
export class GmTaskService {
  constructor(private http: HttpClient) {}

  getTasksByProject(projectId: number): Observable<GmTask[]> {
    return this.http.get<GmTask[]>(`/api/projects/${projectId}/tasks`);
  }

  createTask(projectId: number, payload: CreateGmTaskRequest): Observable<GmTask> {
    return this.http.post<GmTask>(`/api/projects/${projectId}/tasks`, payload);
  }

  updateTask(taskId: number, payload: UpdateGmTaskRequest): Observable<GmTask> {
    return this.http.put<GmTask>(`/api/tasks/${taskId}`, payload);
  }
}