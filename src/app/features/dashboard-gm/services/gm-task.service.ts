import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateGmTaskRequest, GmTask, UpdateGmTaskRequest } from '../models/gm-task.model';
import { API_PROJECTS_URL, API_TASKS_URL } from 'src/app/core/config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GmTaskService {
  constructor(private http: HttpClient) {}

  getTasksByProject(projectId: number): Observable<GmTask[]> {
    return this.http.get<GmTask[]>(`${API_PROJECTS_URL}/${projectId}/tasks`);
  }

  createTask(projectId: number, payload: CreateGmTaskRequest): Observable<GmTask> {
    return this.http.post<GmTask>(`${API_PROJECTS_URL}/${projectId}/tasks`, payload);
  }

  updateTask(taskId: number, payload: UpdateGmTaskRequest): Observable<GmTask> {
    return this.http.put<GmTask>(`${API_TASKS_URL}/${taskId}`, payload);
  }
}