import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from './icon.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
  <div *ngIf="open" (click)="close.emit()" style="position:fixed;inset:0;z-index:100;
       background:color-mix(in srgb,var(--ink) 55%,transparent);backdrop-filter:blur(4px);
       display:grid;place-items:center;padding:16px;">
    <div (click)="$event.stopPropagation()" style="width:min(420px,100%);background:var(--bg);
         border-radius:var(--radius-xl);border:1px solid var(--line);padding:32px 30px;box-shadow:0 40px 90px -30px rgba(0,0,0,.5);">
      <h3 class="display" style="font-size:23px;text-align:center;margin:0 0 6px;color:var(--ink);">Member log in</h3>
      <p style="font-size:14.5px;text-align:center;color:var(--ink-soft);margin:0 0 24px;line-height:1.5;">Access your plans, files, and upcoming sessions.</p>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <input [(ngModel)]="email" placeholder="you@email.com" [ngStyle]="inp" (keyup.enter)="doLogin()" />
        <input [(ngModel)]="password" type="password" placeholder="Password (sent to your email)" [ngStyle]="inp" (keyup.enter)="doLogin()" />
        <button (click)="doLogin()" [ngStyle]="primaryLg" style="width:100%;">Log in</button>
      </div>
      <p *ngIf="error" style="font-size:13px;text-align:center;color:var(--accent);margin:12px 0 0;">{{ error }}</p>
      <p style="font-size:13px;text-align:center;color:var(--ink-soft);margin:18px 0 0;line-height:1.5;">
        New here? <button (click)="close.emit()" style="background:none;border:none;cursor:pointer;font-family:inherit;
        font-size:13px;font-weight:600;color:var(--accent);padding:0;text-decoration:underline;text-underline-offset:3px;">
        Subscribe to a program</button> to get your login.</p>
      <div style="border-top:1px solid var(--line);margin:18px 0 0;padding-top:14px;text-align:center;font-size:12.5px;color:var(--ink-soft);">
        Demo — coach: jordan&#64;rehabandrise.com / coach123 · member: alex.morgan&#64;email.com / member123
      </div>
    </div>
  </div>
  `,
})
export class LoginModalComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  email = '';
  password = '';
  error = '';

  inp = { width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '15.5px', padding: '13px 14px',
    borderRadius: '11px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', outline: 'none' };
  primaryLg = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
    fontFamily: 'inherit', fontWeight: '600', border: '1px solid transparent', borderRadius: 'var(--radius-pill)',
    cursor: 'pointer', fontSize: '17px', padding: '17px 30px', background: 'var(--accent)', color: 'var(--accent-ink)' };

  constructor(private auth: AuthService, private router: Router) {}

  doLogin(): void {
    this.error = '';
    if (!this.email || !this.password) { this.error = 'Email and password required'; return; }
    this.auth.login(this.email, this.password).subscribe({
      next: (r) => {
        this.close.emit();
        this.router.navigate([r.member.isAdmin ? '/coach' : '/dashboard']);
      },
      error: (err) => { this.error = err?.error?.error || 'Invalid credentials'; },
    });
  }
}
