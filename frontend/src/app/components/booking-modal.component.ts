import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { ApiService } from '../services/api.service';
import { Availability, Slot } from '../services/models';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
  <div *ngIf="open" (click)="close.emit()" style="position:fixed;inset:0;z-index:100;
       background:color-mix(in srgb,var(--ink) 55%,transparent);backdrop-filter:blur(4px);
       display:flex;align-items:flex-start;justify-content:center;
       padding:clamp(12px,5vh,56px) 16px;overflow-y:auto;">
    <div (click)="$event.stopPropagation()" style="width:min(720px,100%);background:var(--bg);
         border-radius:var(--radius-xl);border:1px solid var(--line);
         box-shadow:0 40px 90px -30px rgba(0,0,0,.5);overflow:hidden;">

      <!-- header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;
           border-bottom:1px solid var(--line);background:var(--surface);">
        <div style="display:flex;align-items:center;gap:11px;">
          <span style="width:38px;height:38px;border-radius:10px;background:var(--primary-soft);
                color:var(--primary);display:grid;place-items:center;"><app-icon name="video" [size]="20"/></span>
          <div>
            <div class="display" style="font-size:17px;font-weight:600;color:var(--ink);line-height:1.1;">Free 15-minute call</div>
            <div style="font-size:13px;color:var(--ink-soft);">Over Google Meet · no cost, no pressure</div>
          </div>
        </div>
        <button (click)="close.emit()" aria-label="Close" style="width:38px;height:38px;border-radius:9px;
                border:1px solid var(--line);background:var(--surface);cursor:pointer;display:grid;
                place-items:center;color:var(--ink);"><app-icon name="close" [size]="18"/></button>
      </div>

      <div style="padding:22px 24px;">
        <!-- step indicator -->
        <div *ngIf="step < 3" style="overflow-x:auto;padding-bottom:18px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <ng-container *ngFor="let l of stepLabels; let i = index">
              <div style="display:flex;align-items:center;gap:8px;">
                <span [style.background]="i < step ? 'var(--primary)' : i === step ? 'var(--accent)' : 'var(--surface-2)'"
                      [style.color]="i <= step ? '#fff' : 'var(--ink-soft)'"
                      style="width:24px;height:24px;border-radius:999px;font-size:12.5px;font-weight:700;
                      display:grid;place-items:center;flex:0 0 auto;">{{ i < step ? '✓' : i + 1 }}</span>
                <span class="step-label" [style.color]="i === step ? 'var(--ink)' : 'var(--ink-soft)'"
                      style="font-size:13px;font-weight:600;">{{ l }}</span>
              </div>
              <span *ngIf="i < stepLabels.length - 1" style="flex:1;height:1px;background:var(--line);min-width:8px;"></span>
            </ng-container>
          </div>
        </div>

        <!-- STEP 0 — calendar -->
        <div *ngIf="step === 0" style="margin-top:6px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div class="display" style="font-size:19px;font-weight:600;color:var(--ink);">{{ months[viewM] }} {{ viewY }}</div>
            <div style="display:flex;gap:8px;">
              <button (click)="canPrev() && shift(-1)" [style.opacity]="canPrev() ? 1 : .35"
                      [style.cursor]="canPrev() ? 'pointer' : 'default'" [ngStyle]="navBtn"><app-icon name="chevronL" [size]="18"/></button>
              <button (click)="shift(1)" [ngStyle]="navBtn"><app-icon name="chevron" [size]="18"/></button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">
            <div *ngFor="let d of ['Mo','Tu','We','Th','Fr','Sa','Su']"
                 style="text-align:center;font-size:12px;font-weight:600;color:var(--ink-soft);padding:4px 0 8px;">{{ d }}</div>
            <ng-container *ngFor="let cell of cells; let i = index">
              <div *ngIf="!cell"></div>
              <button *ngIf="cell" [disabled]="!cell.enabled" (click)="selectDate(cell.key)"
                      [ngStyle]="dayStyle(cell)" style="aspect-ratio:1/1;border-radius:11px;font-family:inherit;
                      font-size:15px;font-weight:600;position:relative;">
                {{ cell.d }}
                <span *ngIf="cell.enabled && date !== cell.key" style="position:absolute;bottom:6px;left:50%;
                      transform:translateX(-50%);width:5px;height:5px;border-radius:999px;background:var(--accent);"></span>
              </button>
            </ng-container>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:16px;font-size:13px;color:var(--ink-soft);">
            <span style="width:6px;height:6px;border-radius:999px;background:var(--accent);"></span>
            Available for a free call
          </div>
        </div>

        <!-- STEP 1 — time -->
        <div *ngIf="step === 1" style="margin-top:6px;">
          <button (click)="step = 0" [ngStyle]="backBtn"><app-icon name="chevronL" [size]="16"/> Back to calendar</button>
          <div class="display" style="font-size:19px;font-weight:600;color:var(--ink);margin-bottom:4px;">{{ fmtLong(date) }}</div>
          <p style="font-size:14px;color:var(--ink-soft);margin:0 0 18px;">Pick a time that suits you — all times shown in your local timezone.</p>
          <div class="slot-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            <button *ngFor="let s of daySlots" [disabled]="s.taken" (click)="selectTime(s.time)"
                    [ngStyle]="slotStyle(s)" style="padding:14px 10px;border-radius:11px;font-family:inherit;
                    font-size:15.5px;font-weight:600;">{{ s.time }}</button>
          </div>
        </div>

        <!-- STEP 2 — details -->
        <form *ngIf="step === 2" (ngSubmit)="submitDetails()" style="margin-top:6px;">
          <button type="button" (click)="step = 1" [ngStyle]="backBtn"><app-icon name="chevronL" [size]="16"/> Back to times</button>
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:11px;
               background:var(--primary-soft);color:var(--primary);margin-bottom:20px;font-size:14.5px;font-weight:600;">
            <app-icon name="calendar" [size]="18"/> {{ fmtLong(date) }} · {{ time }}
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label style="display:block;">
              <span [ngStyle]="lbl">Full name</span>
              <span style="position:relative;display:block;">
                <span [ngStyle]="inIcon"><app-icon name="user" [size]="18"/></span>
                <input type="text" [(ngModel)]="form.name" name="name" placeholder="Alex Morgan"
                       [ngStyle]="inputStyle('name', true)" />
              </span>
              <span *ngIf="errors['name']" [ngStyle]="errStyle">{{ errors['name'] }}</span>
            </label>
            <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <label style="display:block;">
                <span [ngStyle]="lbl">Email</span>
                <span style="position:relative;display:block;">
                  <span [ngStyle]="inIcon"><app-icon name="mail" [size]="18"/></span>
                  <input type="email" [(ngModel)]="form.email" name="email" placeholder="you@email.com"
                         [ngStyle]="inputStyle('email', true)" />
                </span>
                <span *ngIf="errors['email']" [ngStyle]="errStyle">{{ errors['email'] }}</span>
              </label>
              <label style="display:block;">
                <span [ngStyle]="lbl">Phone</span>
                <span style="position:relative;display:block;">
                  <span [ngStyle]="inIcon"><app-icon name="phone" [size]="18"/></span>
                  <input type="tel" [(ngModel)]="form.phone" name="phone" placeholder="+44 7700 900000"
                         [ngStyle]="inputStyle('phone', true)" />
                </span>
                <span *ngIf="errors['phone']" [ngStyle]="errStyle">{{ errors['phone'] }}</span>
              </label>
            </div>
            <label style="display:block;">
              <span [ngStyle]="lbl">Which area are you most interested in?</span>
              <select [(ngModel)]="form.program" name="program" [ngStyle]="inputStyle('program', false)"
                      style="appearance:none;">
                <option *ngFor="let o of programOptions">{{ o }}</option>
              </select>
            </label>
            <label style="display:block;">
              <span [ngStyle]="lbl">What are you working through? <span style="color:var(--ink-soft);font-weight:400;">(optional)</span></span>
              <textarea [(ngModel)]="form.note" name="note" rows="3"
                        placeholder="A few words on your injury, goal, or where you're stuck…"
                        [ngStyle]="inputStyle('note', false)" style="resize:vertical;"></textarea>
            </label>
          </div>
          <div style="margin-top:24px;">
            <button type="submit" [ngStyle]="primaryLg" style="width:100%;">Confirm my free call<app-icon name="arrow" [size]="19"/></button>
            <p style="font-size:12.5px;color:var(--ink-soft);text-align:center;margin:12px 0 0;">We'll only use your details to arrange this call. No spam, ever.</p>
          </div>
          <p *ngIf="apiError" [ngStyle]="errStyle" style="text-align:center;">{{ apiError }}</p>
        </form>

        <!-- STEP 3 — confirmation -->
        <div *ngIf="step === 3" style="text-align:center;padding:14px 0 8px;">
          <div style="width:70px;height:70px;border-radius:999px;background:var(--primary-soft);color:var(--primary);
               display:grid;place-items:center;margin:0 auto 22px;"><app-icon name="check" [size]="36" [stroke]="2.4"/></div>
          <h3 class="display" style="font-size:28px;margin:0 0 10px;color:var(--ink);letter-spacing:-.02em;">You're booked in, {{ firstName }}!</h3>
          <p style="font-size:16px;color:var(--ink-soft);line-height:1.55;max-width:440px;margin:0 auto 26px;">
            A confirmation and your Google Meet link are on the way to <strong style="color:var(--ink);">{{ form.email }}</strong>.
          </p>
          <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);
               padding:20px 22px;text-align:left;max-width:460px;margin:0 auto;">
            <div style="display:flex;align-items:center;gap:11px;padding-bottom:16px;border-bottom:1px solid var(--line);">
              <span style="color:var(--accent);"><app-icon name="calendar" [size]="20"/></span>
              <div>
                <div style="font-size:15.5px;font-weight:600;color:var(--ink);">{{ fmtLong(date) }}</div>
                <div style="font-size:13.5px;color:var(--ink-soft);">{{ time }} · 15 minutes</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:11px;padding-top:16px;">
              <span style="color:var(--accent);"><app-icon name="video" [size]="20"/></span>
              <div style="min-width:0;">
                <div style="font-size:13.5px;color:var(--ink-soft);">Google Meet link</div>
                <div style="font-size:15px;font-weight:600;color:var(--primary);font-family:ui-monospace,Menlo,monospace;
                     white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ meetLink }}</div>
              </div>
            </div>
          </div>
          <div style="margin-top:26px;">
            <button (click)="close.emit()" [ngStyle]="primaryLg">Done</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class BookingModalComponent implements OnChanges {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  step = 0;
  stepLabels = ['Pick a day', 'Pick a time', 'Your details', 'Confirmed'];
  months = MONTHS;
  programOptions = ['Not sure yet', 'Recovery Rehab', 'Strength & Movement', 'Nutrition Reset', 'The Full Reset'];

  availability: Availability = {};
  viewY = new Date().getFullYear();
  viewM = new Date().getMonth();
  date: string | null = null;
  time: string | null = null;
  meetLink = '';
  apiError = '';

  form = { name: '', email: '', phone: '', note: '', program: 'Not sure yet' };
  errors: Record<string, string> = {};

  navBtn = { width: '36px', height: '36px', borderRadius: '9px', border: '1px solid var(--line)',
    background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--ink)' };
  backBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    color: 'var(--ink-soft)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
    padding: '0', marginBottom: '16px' };
  lbl = { display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--ink)', marginBottom: '7px' };
  inIcon = { position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' };
  errStyle = { fontSize: '12.5px', color: 'var(--accent)', marginTop: '5px', display: 'block' };
  primaryLg = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
    fontFamily: 'inherit', fontWeight: '600', border: '1px solid transparent', borderRadius: 'var(--radius-pill)',
    cursor: 'pointer', fontSize: '17px', padding: '17px 30px', background: 'var(--accent)',
    color: 'var(--accent-ink)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' };

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (this.open) {
      this.step = 0; this.date = null; this.time = null; this.apiError = '';
      this.form = { name: '', email: '', phone: '', note: '', program: 'Not sure yet' };
      this.errors = {};
      const t = new Date(); this.viewY = t.getFullYear(); this.viewM = t.getMonth();
      if (!Object.keys(this.availability).length) {
        this.api.getAvailability().subscribe((a) => (this.availability = a));
      }
    }
  }

  get firstName(): string { return (this.form.name.split(' ')[0]) || ''; }

  isoKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  get cells(): (null | { d: number; key: string; enabled: boolean })[] {
    const first = new Date(this.viewY, this.viewM, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewY, this.viewM + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out: (null | { d: number; key: string; enabled: boolean })[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(this.viewY, this.viewM, d);
      const key = this.isoKey(dt);
      const slots = this.availability[key];
      const free = !!slots && slots.some((s) => !s.taken);
      const isPast = dt < today;
      out.push({ d, key, enabled: free && !isPast });
    }
    return out;
  }

  get daySlots(): Slot[] { return this.date ? (this.availability[this.date] || []) : []; }

  canPrev(): boolean {
    const today = new Date();
    return this.viewY > today.getFullYear() ||
      (this.viewY === today.getFullYear() && this.viewM > today.getMonth());
  }
  shift(dir: number): void {
    let m = this.viewM + dir, y = this.viewY;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    this.viewM = m; this.viewY = y;
  }

  dayStyle(cell: { key: string; enabled: boolean }) {
    const isSel = this.date === cell.key;
    return {
      cursor: cell.enabled ? 'pointer' : 'default',
      border: isSel ? '1px solid var(--primary)' : `1px solid ${cell.enabled ? 'var(--line)' : 'transparent'}`,
      background: isSel ? 'var(--primary)' : cell.enabled ? 'var(--surface)' : 'transparent',
      color: isSel ? 'var(--primary-ink)' : cell.enabled ? 'var(--ink)' : 'color-mix(in srgb,var(--ink-soft) 45%,transparent)',
      transition: 'background .15s ease, border-color .15s ease',
    };
  }
  slotStyle(s: Slot) {
    return {
      cursor: s.taken ? 'default' : 'pointer',
      border: `1px solid ${s.taken ? 'transparent' : 'var(--line)'}`,
      background: s.taken ? 'var(--surface-2)' : 'var(--surface)',
      color: s.taken ? 'color-mix(in srgb,var(--ink-soft) 50%,transparent)' : 'var(--ink)',
      textDecoration: s.taken ? 'line-through' : 'none',
      transition: 'border-color .15s ease, background .15s ease',
    };
  }
  inputStyle(key: string, hasIcon: boolean) {
    return {
      width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '15.5px',
      padding: hasIcon ? '13px 14px 13px 40px' : '13px 14px', borderRadius: '11px',
      border: `1px solid ${this.errors[key] ? 'var(--accent)' : 'var(--line)'}`,
      background: 'var(--surface)', color: 'var(--ink)', outline: 'none',
    };
  }

  selectDate(key: string): void { this.date = key; this.time = null; this.step = 1; }
  selectTime(t: string): void { this.time = t; this.step = 2; }

  fmtLong(dateKey: string | null): string {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return `${DOW[dt.getDay()]} ${d} ${MONTHS[m - 1]}`;
  }

  validate(): boolean {
    const e: Record<string, string> = {};
    if (!this.form.name.trim()) e['name'] = 'Please enter your name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email)) e['email'] = 'Enter a valid email';
    if (this.form.phone.replace(/\D/g, '').length < 7) e['phone'] = 'Enter a valid phone number';
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  submitDetails(): void {
    this.apiError = '';
    if (!this.validate()) return;
    this.api.createBooking({
      date: this.date!, time: this.time!, name: this.form.name, email: this.form.email,
      phone: this.form.phone, program: this.form.program, note: this.form.note,
    }).subscribe({
      next: (r) => { this.meetLink = r.meetLink; this.step = 3; },
      error: (err) => { this.apiError = err?.error?.error || 'Something went wrong — please try another slot.'; },
    });
  }
}
