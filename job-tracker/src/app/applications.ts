import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobApplication, JobApplicationCreate } from './job-application';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApplicationsService {
  private apiUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  getApplications(): Observable<JobApplication[]> {
    return this.http.get<JobApplication[]>(this.apiUrl);
  }

  createApplication(application: JobApplicationCreate): Observable<JobApplication> {
    return this.http.post<JobApplication>(this.apiUrl, application);
  }

  updateApplication(id: number, application: JobApplicationCreate): Observable<JobApplication> {
    return this.http.put<JobApplication>(`${this.apiUrl}/${id}`, application);
  }

  toggleStar(id: number): Observable<JobApplication> {
    return this.http.patch<JobApplication>(`${this.apiUrl}/${id}/star`, {});
  }

  deleteApplication(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
