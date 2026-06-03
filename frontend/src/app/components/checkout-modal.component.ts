import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { ApiService } from '../services/api.service';
import { Program } from '../services/models';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
  <div *ngIf="program" (click)="close.emit()" style="position:fixed;inset:0;z-index:100;
       background:color-mix(in srgb,var(--ink) 55%,transparent);backdrop-filter:blur(4px);
       display:flex;align-items:flex-start;justify-content:center;padding:clamp(12px,5vh,56px) 16px;overflow-y:auto;">
    <div (click)="$event.stopPropagation()" style="width:min(680px,100%);background:var(--bg);
         border-radius:var(--radius-xl);border:1px solid var(--line);box-shadow:0 40px 90px -30px rgba(0,0,0,.5);overflow:hidden;">

      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;
           border-bottom:1px solid var(--line);background:var(--surface);">
        <div style="display:flex;align-items:center;gap:11px;">
          <span style="width:38px;height:38px;border-radius:10px;background:var(--accent-soft);color:var(--accent);
                display:grid;place-items:center;"><app-icon name="spark" [size]="20"/></span>
          <div>
            <div class="display" style="font-size:17px;font-weight:600;color:var(--ink);line-height:1.1;">{{ done ? "You're all set" : 'Subscribe' }}</div>
            <div style="font-size:13px;color:var(--ink-soft);">{{ done ? 'Payment received' : 'One-time payment · card not stored' }}</div>
          </div>
        </div>
        <button (click)="close.emit()" aria-label="Close" style="width:38px;height:38px;border-radius:9px;
                border:1px solid var(--line);background:var(--surface);cursor:pointer;display:grid;
                place-items:center;color:var(--ink);"><app-icon name="close" [size]="18"/></button>
      </div>

      <div *ngIf="!done" class="checkout-grid" style="display:grid;grid-template-columns:1fr .82fr;">
        <form (ngSubmit)="pay()" style="padding:24px;border-right:1px solid var(--line);">
          <div class="display" style="font-size:18px;font-weight:600;color:var(--ink);margin-bottom:16px;">Create your account</div>
          <div style="display:flex;flex-direction:column;gap:15px;">
            <label style="display:block;">
              <span [ngStyle]="lbl">Full name</span>
              <input [(ngModel)]="form.name" name="name" placeholder="Alex Morgan" [ngStyle]="inputStyle('name')" />
              <span *ngIf="errors['name']" [ngStyle]="errStyle">{{ errors['name'] }}</span>
            </label>
            <label style="display:block;">
              <span [ngStyle]="lbl">Email</span>
              <input [(ngModel)]="form.email" name="email" placeholder="you@email.com" [ngStyle]="inputStyle('email')" />
              <span *ngIf="errors['email']" [ngStyle]="errStyle">{{ errors['email'] }}</span>
            </label>
          </div>
          <div class="display" style="font-size:18px;font-weight:600;color:var(--ink);margin:26px 0 16px;">Payment</div>
          <div style="display:flex;flex-direction:column;gap:15px;">
            <label style="display:block;">
              <span [ngStyle]="lbl">Card number</span>
              <input [(ngModel)]="form.card" name="card" inputmode="numeric" placeholder="4242 4242 4242 4242" [ngStyle]="inputStyle('card')" />
              <span *ngIf="errors['card']" [ngStyle]="errStyle">{{ errors['card'] }}</span>
            </label>
            <div style="display:flex;gap:12px;">
              <label style="display:block;flex:1 1 0;">
                <span [ngStyle]="lbl">Expiry</span>
                <input [(ngModel)]="form.exp" name="exp" inputmode="numeric" placeholder="08 / 28" [ngStyle]="inputStyle('exp')" />
                <span *ngIf="errors['exp']" [ngStyle]="errStyle">{{ errors['exp'] }}</span>
              </label>
              <label style="display:block;flex:1 1 0;">
                <span [ngStyle]="lbl">CVC</span>
                <input [(ngModel)]="form.cvc" name="cvc" inputmode="numeric" placeholder="123" [ngStyle]="inputStyle('cvc')" />
                <span *ngIf="errors['cvc']" [ngStyle]="errStyle">{{ errors['cvc'] }}</span>
              </label>
            </div>
          </div>
          <div style="margin-top:22px;">
            <button type="submit" [ngStyle]="primaryLg" style="width:100%;">Pay £{{ program.price }} &amp; start<app-icon name="arrow" [size]="19"/></button>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:14px;font-size:12.5px;color:var(--ink-soft);">
            <app-icon name="shield" [size]="15"/> We never store your card — it's used once for this payment
          </div>
          <p style="text-align:center;margin:14px 0 0;font-size:13.5px;">
            <button type="button" (click)="bookInstead.emit()" style="background:none;border:none;cursor:pointer;
                    font-family:inherit;font-size:13.5px;color:var(--ink-soft);text-decoration:underline;text-underline-offset:3px;">
              Rather talk first? Book a free 15-min call</button>
          </p>
          <p *ngIf="apiError" [ngStyle]="errStyle" style="text-align:center;">{{ apiError }}</p>
        </form>

        <div style="padding:24px;background:var(--surface-2);">
          <div style="font-size:12.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);">Your plan</div>
          <div class="display" style="font-size:22px;font-weight:600;color:var(--ink);margin:10px 0 2px;">{{ program.name }}</div>
          <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:6px;">
            <span class="display" style="font-size:32px;font-weight:600;color:var(--ink);">£{{ program.price }}</span>
            <span style="font-size:14px;color:var(--ink-soft);">{{ program.cadence }}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:18px;line-height:1.4;">Pay-as-you-go — one month of access. Renew when you like; nothing auto-charges.</div>
          <div *ngFor="let f of summaryFeatures" style="display:flex;gap:9px;align-items:flex-start;font-size:14px;color:var(--ink);margin-bottom:10px;">
            <span style="color:var(--accent);flex:0 0 auto;margin-top:1px;"><app-icon name="check" [size]="17" [stroke]="2"/></span>{{ f }}
          </div>
          <div style="border-top:1px solid var(--line);margin-top:16px;padding-top:16px;display:flex;justify-content:space-between;font-size:14.5px;">
            <span style="color:var(--ink-soft);">Total today</span>
            <strong style="color:var(--ink);">£{{ program.price }}</strong>
          </div>
        </div>
      </div>

      <div *ngIf="done" style="text-align:center;padding:34px 26px 30px;">
        <div style="width:70px;height:70px;border-radius:999px;background:var(--primary-soft);color:var(--primary);
             display:grid;place-items:center;margin:0 auto 22px;"><app-icon name="check" [size]="36" [stroke]="2.4"/></div>
        <h3 class="display" style="font-size:27px;margin:0 0 10px;color:var(--ink);letter-spacing:-.02em;">Welcome aboard, {{ firstName }}!</h3>
        <p style="font-size:16px;color:var(--ink-soft);line-height:1.55;max-width:460px;margin:0 auto 18px;">
          Your <strong style="color:var(--ink);">{{ program.name }}</strong> month is paid and your access is live.
          We've emailed a password to <strong style="color:var(--ink);">{{ form.email }}</strong> — log in to find your plan, files, and sessions waiting in your dashboard.
        </p>
        <div *ngIf="devPassword" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);
             padding:14px 18px;max-width:360px;margin:0 auto 24px;font-size:13.5px;color:var(--ink-soft);">
          Prototype login password: <strong style="color:var(--primary);font-family:ui-monospace,Menlo,monospace;">{{ devPassword }}</strong>
        </div>
        <div style="display:flex;gap:11px;justify-content:center;flex-wrap:wrap;">
          <button (click)="complete.emit()" [ngStyle]="primaryLg">Go to log in<app-icon name="arrow" [size]="19"/></button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class CheckoutModalComponent implements OnChanges {
  @Input() program: Program | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() complete = new EventEmitter<void>();
  @Output() bookInstead = new EventEmitter<void>();

  done = false;
  devPassword = '';
  apiError = '';
  form = { name: '', email: '', card: '', exp: '', cvc: '' };
  errors: Record<string, string> = {};

  lbl = { display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--ink)', marginBottom: '7px' };
  errStyle = { fontSize: '12.5px', color: 'var(--accent)', marginTop: '5px', display: 'block' };
  primaryLg = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
    fontFamily: 'inherit', fontWeight: '600', border: '1px solid transparent', borderRadius: 'var(--radius-pill)',
    cursor: 'pointer', fontSize: '17px', padding: '17px 30px', background: 'var(--accent)',
    color: 'var(--accent-ink)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' };

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (this.program) {
      this.form = { name: '', email: '', card: '', exp: '', cvc: '' };
      this.errors = {}; this.done = false; this.devPassword = ''; this.apiError = '';
    }
  }

  get firstName(): string { return (this.form.name.split(' ')[0]) || ''; }
  get summaryFeatures(): string[] {
    return this.program?.features?.length ? this.program.features
      : ['Full programme access', 'Direct message support', 'Plans & files in your dashboard'];
  }

  inputStyle(key: string) {
    return {
      width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '15.5px', padding: '13px 14px',
      borderRadius: '11px', border: `1px solid ${this.errors[key] ? 'var(--accent)' : 'var(--line)'}`,
      background: 'var(--surface)', color: 'var(--ink)', outline: 'none',
    };
  }

  validate(): boolean {
    const e: Record<string, string> = {};
    if (!this.form.name.trim()) e['name'] = 'Enter your name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email)) e['email'] = 'Enter a valid email';
    if (this.form.card.replace(/\D/g, '').length < 12) e['card'] = 'Enter a card number';
    if (!/^\d{1,2}\s*\/\s*\d{2}$/.test(this.form.exp.trim())) e['exp'] = 'MM / YY';
    if (this.form.cvc.replace(/\D/g, '').length < 3) e['cvc'] = 'CVC';
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  pay(): void {
    this.apiError = '';
    if (!this.validate() || !this.program) return;
    this.api.subscribe({ name: this.form.name, email: this.form.email, programId: this.program.id })
      .subscribe({
        next: (r) => { this.devPassword = r.devPassword; this.done = true; },
        error: (err) => { this.apiError = err?.error?.error || 'Payment could not be processed.'; },
      });
  }
}
