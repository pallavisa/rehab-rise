import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthMember } from './models';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:4000/api'
  : 'https://rehab-rise-production.up.railway.app/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  get token(): string | null { return localStorage.getItem('rr_token'); }
  get member(): AuthMember | null {
    const raw = localStorage.getItem('rr_member');
    return raw ? JSON.parse(raw) : null;
  }
  get isLoggedIn(): boolean { return !!this.token; }
  get isAdmin(): boolean { return !!this.member?.isAdmin; }

  login(email: string, password: string): Observable<{ token: string; member: AuthMember }> {
    return this.http.post<{ token: string; member: AuthMember }>(`${API}/login`, { email, password }).pipe(
      tap((r) => {
        localStorage.setItem('rr_token', r.token);
        localStorage.setItem('rr_member', JSON.stringify(r.member));
      })
    );
  }
  logout(): void {
    localStorage.removeItem('rr_token');
    localStorage.removeItem('rr_member');
  }
}
