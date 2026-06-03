import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../icon.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MemberOverview, MemberSession, ClientFile, PlanSession } from '../../services/models';
import { fmtDay, fmtTime, relDay, MO_S, toDate } from '../shared/format';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './member-dashboard.component.html',
})
export class MemberDashboardComponent implements OnInit {
  view = 'overview';
  navOpen = false;
  data: MemberOverview | null = null;

  fileCat = 'all';
  doneToday = false;

  nav = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'program', label: 'My Program', icon: 'dumbbell' },
    { id: 'sessions', label: 'Sessions', icon: 'calendar' },
    { id: 'files', label: 'Files', icon: 'file' },
    { id: 'billing', label: 'Billing', icon: 'card' },
  ];

  fmtDay = fmtDay; fmtTime = fmtTime; relDay = relDay; MO_S = MO_S;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.api.memberOverview().subscribe((d) => (this.data = d));
    const key = 'rr_done_' + new Date().toISOString().slice(0, 10);
    this.doneToday = localStorage.getItem(key) === '1';
  }

  setView(v: string): void { this.view = v; this.navOpen = false; window.scrollTo(0, 0); }
  logout(): void { this.auth.logout(); this.router.navigate(['/']); }

  get firstName(): string { return this.data?.member.first || ''; }
  get coach(): string { return this.data?.member.coach || 'your coach'; }
  get newFiles(): ClientFile[] { return this.data?.files.filter((f) => f.isNew) || []; }
  get newFileCount(): number { return this.newFiles.length; }

  get topTitle(): string {
    return { overview: `Welcome back, ${this.firstName}`, program: 'My Program', sessions: 'Sessions',
      files: 'Files', billing: 'Billing' }[this.view] || '';
  }
  get topSub(): string {
    return { overview: "Here's where things stand today.", program: "Your plan and today's session.",
      sessions: 'Your upcoming and past video sessions.', files: 'Plans, videos, and reports shared by your coach.',
      billing: 'Your program access, payments, and how billing works.' }[this.view] || '';
  }

  // ---- sessions ----
  get upcoming(): MemberSession[] {
    return (this.data?.sessions || []).filter((s) => s.status === 'upcoming')
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  get past(): MemberSession[] {
    return (this.data?.sessions || []).filter((s) => s.status === 'done')
      .sort((a, b) => b.start.localeCompare(a.start));
  }
  get nextSession(): MemberSession | null { return this.upcoming[0] || null; }
  dayNum(v: string): number { return toDate(v)?.getDate() || 0; }
  monthShort(v: string): string { const d = toDate(v); return d ? MO_S[d.getMonth()] : ''; }

  // ---- today's plan from coach-authored plan ----
  get todaySession(): { title: string; est: string; rest: boolean; blocks: { name: string; detail: string; hasVideo: boolean; video: string }[] } {
    const dow = new Date().getDay();
    const sessions = this.data?.plan?.sessions || [];
    const s = sessions.find((x: PlanSession) => (x.days || []).includes(dow));
    if (!s) {
      return { title: 'Rest & recover', est: 'Rest day', rest: true, blocks: [
        { name: 'Gentle mobility (optional)', detail: '10 min', hasVideo: false, video: '' },
        { name: 'Hydrate & sleep well', detail: 'Recovery is where progress is made', hasVideo: false, video: '' },
      ] };
    }
    return { title: s.title, est: s.est, rest: false,
      blocks: s.exercises.map((e) => ({ name: e.name, detail: e.detail, hasVideo: !!e.video, video: e.video || '' })) };
  }

  markDone(): void {
    this.doneToday = true;
    localStorage.setItem('rr_done_' + new Date().toISOString().slice(0, 10), '1');
  }
  undoDone(): void {
    this.doneToday = false;
    localStorage.removeItem('rr_done_' + new Date().toISOString().slice(0, 10));
  }

  // ---- files ----
  fileCats = [
    { id: 'all', label: 'All files' },
    { id: 'plan', label: 'Exercise plans' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'video', label: 'Videos' },
    { id: 'report', label: 'Reports' },
  ];
  get shownFiles(): ClientFile[] {
    const files = this.data?.files || [];
    return this.fileCat === 'all' ? files : files.filter((f) => (f.cat || f.category) === this.fileCat);
  }
  catCount(id: string): number {
    const files = this.data?.files || [];
    return id === 'all' ? files.length : files.filter((f) => (f.cat || f.category) === id).length;
  }
  downloadUrl(id: number): string { return this.api.fileDownloadUrl(id); }
  fileColor(ext: string): { bg: string; fg: string } {
    if (ext === 'pdf') return { bg: 'var(--accent-soft)', fg: 'var(--accent)' };
    if (ext === 'mp4') return { bg: 'var(--primary-soft)', fg: 'var(--primary)' };
    return { bg: 'var(--surface-2)', fg: 'var(--ink-soft)' };
  }

  openMeet(meet: string): void { window.open('https://' + meet, '_blank'); }
  openVideo(v: string): void { if (v) window.open(v, '_blank'); }

  // ---- button styles ----
  private base(size: 'sm' | 'md' | 'lg') {
    const s = { sm: { fontSize: '14px', padding: '10px 16px' }, md: { fontSize: '15.5px', padding: '14px 22px' }, lg: { fontSize: '17px', padding: '17px 30px' } };
    return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px', fontFamily: 'inherit',
      fontWeight: '600', border: '1px solid transparent', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
      textDecoration: 'none', whiteSpace: 'nowrap', ...s[size] };
  }
  primaryBtn(size: 'sm' | 'md' | 'lg' = 'md') { return { ...this.base(size), background: 'var(--accent)', color: 'var(--accent-ink)' }; }
  darkBtn(size: 'sm' | 'md' | 'lg' = 'md') { return { ...this.base(size), background: 'var(--primary)', color: 'var(--primary-ink)' }; }

  card(pad = 24) { return { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: pad + 'px' }; }
  cardPrimary(pad = 24) { return { background: 'var(--primary)', border: '1px solid transparent', color: 'var(--primary-ink)', borderRadius: 'var(--radius-lg)', padding: pad + 'px' }; }
  cardAccentSoft(pad = 24) { return { background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb,var(--accent) 22%,transparent)', borderRadius: 'var(--radius-lg)', padding: pad + 'px' }; }
  cardTitleRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' };
  cardTitle = { fontFamily: 'var(--headline-font)', fontSize: '18px', fontWeight: '600', color: 'var(--ink)', margin: '0', letterSpacing: '-.01em' };
  linkBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: 'var(--accent)', padding: '0' };

  pill(tone: 'neutral' | 'primary' | 'accent' | 'good' = 'neutral') {
    const tones: Record<string, { bg: string; fg: string }> = {
      neutral: { bg: 'var(--surface-2)', fg: 'var(--ink-soft)' },
      primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
      accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
      good: { bg: 'color-mix(in srgb, #3f8a5a 16%, var(--surface))', fg: '#2f6e45' },
    };
    const tn = tones[tone];
    return { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600',
      padding: '4px 10px', borderRadius: '999px', background: tn.bg, color: tn.fg, lineHeight: '1.3' };
  }
}
