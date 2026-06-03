import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Program, Availability, BookingResult, SubscribeResult,
  AdminProgram, Client, AdminBooking, Stat, MemberOverview, TrainingPlan, ClientFile,
} from './models';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ---- public ----
  getPrograms(): Observable<Program[]> { return this.http.get<Program[]>(`${API}/programs`); }
  getAvailability(): Observable<Availability> { return this.http.get<Availability>(`${API}/availability`); }
  createBooking(body: { date: string; time: string; name: string; email: string; phone: string; program: string; note: string; }): Observable<BookingResult> {
    return this.http.post<BookingResult>(`${API}/bookings`, body);
  }
  subscribe(body: { name: string; email: string; programId: string }): Observable<SubscribeResult> {
    return this.http.post<SubscribeResult>(`${API}/subscribe`, body);
  }

  // ---- admin: programs ----
  adminGetPrograms(): Observable<AdminProgram[]> { return this.http.get<AdminProgram[]>(`${API}/admin/programs`); }
  adminCreateProgram(p: Partial<AdminProgram>): Observable<AdminProgram> { return this.http.post<AdminProgram>(`${API}/admin/programs`, p); }
  adminUpdateProgram(id: string, p: Partial<AdminProgram>): Observable<AdminProgram> { return this.http.put<AdminProgram>(`${API}/admin/programs/${id}`, p); }
  adminDeleteProgram(id: string): Observable<any> { return this.http.delete(`${API}/admin/programs/${id}`); }

  // ---- admin: availability template ----
  adminGetTemplate(): Observable<Record<string, Record<string, boolean>>> {
    return this.http.get<Record<string, Record<string, boolean>>>(`${API}/admin/availability-template`);
  }
  adminSaveTemplate(grid: Record<string, Record<string, boolean>>): Observable<any> {
    return this.http.put(`${API}/admin/availability-template`, { grid });
  }

  // ---- admin: bookings / clients / stats ----
  adminGetBookings(): Observable<AdminBooking[]> { return this.http.get<AdminBooking[]>(`${API}/admin/bookings`); }
  adminConfirmBooking(id: number): Observable<any> { return this.http.post(`${API}/admin/bookings/${id}/confirm`, {}); }
  adminGetClients(): Observable<Client[]> { return this.http.get<Client[]>(`${API}/admin/clients`); }
  adminGetClient(id: number): Observable<Client> { return this.http.get<Client>(`${API}/admin/clients/${id}`); }
  adminGetStats(): Observable<Stat[]> { return this.http.get<Stat[]>(`${API}/admin/stats`); }
  adminSaveNote(id: number, note: string): Observable<any> { return this.http.put(`${API}/admin/clients/${id}/note`, { note }); }
  adminSavePlan(id: number, plan: TrainingPlan): Observable<any> { return this.http.put(`${API}/admin/clients/${id}/plan`, { plan }); }

  // ---- admin: files ----
  adminUploadFiles(id: number, files: FileList): Observable<ClientFile[]> {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    return this.http.post<ClientFile[]>(`${API}/admin/clients/${id}/files`, fd);
  }
  adminDeleteFile(fileId: number): Observable<any> { return this.http.delete(`${API}/admin/files/${fileId}`); }
  fileDownloadUrl(fileId: number): string { return `${API}/files/${fileId}/download`; }

  // ---- member ----
  memberOverview(): Observable<MemberOverview> { return this.http.get<MemberOverview>(`${API}/member/overview`); }
}
