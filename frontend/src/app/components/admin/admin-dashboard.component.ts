import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../icon.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminProgram, Client, AdminBooking, Stat, TrainingPlan, PlanSession } from '../../services/models';
import { fmtDay, fmtTime, relDay } from '../shared/format';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DOW_CHIPS: [string, number][] = [['Mo', 1], ['Tu', 2], ['We', 3], ['Th', 4], ['Fr', 5], ['Sa', 6], ['Su', 0]];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  view = 'overview';
  navOpen = false;
  coachName = 'Jordan Reeve';

  nav = [
    { id: 'overview', label: 'Overview', icon: 'grid' },
    { id: 'programs', label: 'Programs', icon: 'dumbbell' },
    { id: 'availability', label: 'Availability', icon: 'calendar' },
    { id: 'bookings', label: 'Bookings', icon: 'bell' },
    { id: 'clients', label: 'Clients', icon: 'user' },
  ];

  stats: Stat[] = [];
  programs: AdminProgram[] = [];
  bookings: AdminBooking[] = [];
  clients: Client[] = [];
  selectedClient: Client | null = null;

  // availability template
  template: Record<string, Record<string, boolean>> = {};
  templateSaved = true;
  newTimeInput = '';
  weekDays = WEEK_DAYS;
  dowChips = DOW_CHIPS;

  get timeRows(): string[] {
    const times = new Set<string>();
    for (const day of Object.values(this.template))
      for (const t of Object.keys(day)) times.add(t);
    return [...times].sort();
  }

  // program editor
  editing: Partial<AdminProgram> | null = null;
  editingFeatures = '';
  isNewProgram = false;
  programError = '';

  // client search/filter
  clientQuery = '';
  clientFilter = 'all';

  // plan builder transient state
  openSession: string | null = null;
  planDirty = false;
  noteDraft = '';

  fmtDay = fmtDay; fmtTime = fmtTime; relDay = relDay;
  iconForProgram: Record<string, string> = { rehab: 'leaf', strength: 'dumbbell', nutrition: 'spark', full: 'spark' };

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.coachName = this.auth.member?.name || 'Coach';
    this.loadStats(); this.loadPrograms(); this.loadBookings(); this.loadClients();
  }

  get newBookings(): number { return this.bookings.filter((b) => b.status === 'new').length; }

  get topTitle(): string {
    if (this.view === 'clients' && this.selectedClient) return 'Client';
    return { overview: `Good morning, ${this.coachName.split(' ')[0]}`, programs: 'Programs',
      availability: 'Availability', bookings: 'Bookings', clients: 'Clients' }[this.view] || '';
  }
  get topSub(): string {
    if (this.view === 'clients' && this.selectedClient) return 'Profile, sessions, and shared files.';
    return { overview: "Here's your day.", programs: 'Add and edit programs shown on your public site.',
      availability: 'Set the slots clients can book.', bookings: 'Free-call requests and confirmed calls.',
      clients: 'Your subscribed clients and their files.' }[this.view] || '';
  }

  setView(v: string): void {
    this.view = v; this.navOpen = false; this.selectedClient = null;
    if (v === 'availability' && !Object.keys(this.template).length) this.loadTemplate();
    window.scrollTo(0, 0);
  }

  logout(): void { this.auth.logout(); this.router.navigate(['/']); }

  // ---- loaders ----
  loadStats(): void { this.api.adminGetStats().subscribe((s) => (this.stats = s)); }
  loadPrograms(): void { this.api.adminGetPrograms().subscribe((p) => (this.programs = p)); }
  loadBookings(): void { this.api.adminGetBookings().subscribe((b) => (this.bookings = b)); }
  loadClients(): void { this.api.adminGetClients().subscribe((c) => (this.clients = c)); }
  loadTemplate(): void { this.api.adminGetTemplate().subscribe((t) => { this.template = t; this.templateSaved = true; }); }

  // ---- overview ----
  get activeClients(): Client[] { return this.clients.filter((c) => c.status === 'Active'); }
  get newBookingList(): AdminBooking[] { return this.bookings.filter((b) => b.status === 'new'); }
  get sortedBookings(): AdminBooking[] { return [...this.bookings].sort((a, b) => a.start.localeCompare(b.start)); }
  bookingGroup(status: string): AdminBooking[] { return this.sortedBookings.filter((b) => b.status === status); }

  confirmBooking(id: number): void {
    this.api.adminConfirmBooking(id).subscribe(() => {
      this.bookings = this.bookings.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b));
      this.loadStats();
    });
  }

  // ---- programs CRUD ----
  newProgram(): void {
    this.isNewProgram = true; this.programError = '';
    this.editing = { id: '', name: '', tag: '', price: 0, cadence: '/ month', summary: '', accent: false, bundle: false, active: true };
    this.editingFeatures = '';
  }
  editProgram(p: AdminProgram): void {
    this.isNewProgram = false; this.programError = '';
    this.editing = { ...p };
    this.editingFeatures = (p.features || []).join('\n');
  }
  cancelEdit(): void { this.editing = null; this.programError = ''; }
  saveProgram(): void {
    if (!this.editing) return;
    const body: Partial<AdminProgram> = {
      ...this.editing,
      features: this.editingFeatures.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    this.programError = '';
    const done = () => { this.editing = null; this.loadPrograms(); };
    if (this.isNewProgram) {
      if (!body.id) { this.programError = 'An id (slug) is required'; return; }
      this.api.adminCreateProgram(body).subscribe({ next: done, error: (e) => (this.programError = e?.error?.error || 'Could not create') });
    } else {
      this.api.adminUpdateProgram(this.editing.id!, body).subscribe({ next: done, error: (e) => (this.programError = e?.error?.error || 'Could not save') });
    }
  }
  deleteProgram(p: AdminProgram): void {
    if (!confirm(`Delete "${p.name}"? This removes it from the public site.`)) return;
    this.api.adminDeleteProgram(p.id).subscribe(() => this.loadPrograms());
  }

  // ---- availability ----
  weekDateState(i: number): 'past' | 'today' | 'future' {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const d = new Date(monday); d.setDate(monday.getDate() + i); d.setHours(0, 0, 0, 0);
    if (d < today) return 'past';
    if (d.getTime() === today.getTime()) return 'today';
    return 'future';
  }
  weekDateNum(i: number): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d.getDate();
  }
  toggleSlot(day: string, time: string, i: number): void {
    if (this.weekDateState(i) === 'past') return;
    this.template[day] = { ...this.template[day], [time]: !this.template[day]?.[time] };
    this.templateSaved = false;
  }
  addTimeRow(): void {
    const t = this.newTimeInput.trim();
    if (!t || !/^\d{2}:\d{2}$/.test(t) || this.timeRows.includes(t)) return;
    for (const d of WEEK_DAYS) this.template[d] = { ...(this.template[d] || {}), [t]: false };
    this.newTimeInput = '';
    this.templateSaved = false;
  }

  removeTimeRow(t: string): void {
    for (const d of WEEK_DAYS) {
      if (this.template[d]) {
        const { [t]: _, ...rest } = this.template[d];
        this.template[d] = rest;
      }
    }
    this.templateSaved = false;
  }

  saveTemplate(): void {
    this.api.adminSaveTemplate(this.template).subscribe(() => (this.templateSaved = true));
  }

  // ---- clients ----
  get filteredClients(): Client[] {
    return this.clients.filter((c) => {
      if (this.clientFilter === 'active' && c.status !== 'Active') return false;
      if (this.clientFilter === 'lapsed' && c.status !== 'Lapsed') return false;
      const q = this.clientQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.program.toLowerCase().includes(q);
    });
  }
  openClient(id: number): void {
    this.api.adminGetClient(id).subscribe((c) => {
      this.selectedClient = c;
      this.noteDraft = c.note || '';
      this.openSession = c.plan?.sessions?.[0]?.id || null;
      this.planDirty = false;
      window.scrollTo(0, 0);
    });
  }
  backToClients(): void { this.selectedClient = null; }

  get reversedFiles() { return this.selectedClient ? [...this.selectedClient.files].reverse() : []; }

  // file upload
  onFilePick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedClient) return;
    this.api.adminUploadFiles(this.selectedClient.id, input.files).subscribe((created) => {
      if (this.selectedClient) this.selectedClient.files = [...this.selectedClient.files, ...created];
      input.value = '';
    });
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    if (!ev.dataTransfer?.files?.length || !this.selectedClient) return;
    this.api.adminUploadFiles(this.selectedClient.id, ev.dataTransfer.files).subscribe((created) => {
      if (this.selectedClient) this.selectedClient.files = [...this.selectedClient.files, ...created];
    });
  }
  removeFile(fileId: number): void {
    if (!this.selectedClient) return;
    this.api.adminDeleteFile(fileId).subscribe(() => {
      if (this.selectedClient) this.selectedClient.files = this.selectedClient.files.filter((f) => f.id !== fileId);
    });
  }
  downloadUrl(fileId: number): string { return this.api.fileDownloadUrl(fileId); }
  saveNote(): void {
    if (!this.selectedClient) return;
    this.api.adminSaveNote(this.selectedClient.id, this.noteDraft).subscribe(() => {
      if (this.selectedClient) this.selectedClient.note = this.noteDraft;
    });
  }

  // ---- training plan builder ----
  uid(p: string): string { return p + Math.random().toString(36).slice(2, 8); }
  get plan(): TrainingPlan { return this.selectedClient?.plan || { sessions: [] }; }
  todayDOW(): number { return new Date().getDay(); }
  sessionOnToday(s: PlanSession): boolean { return (s.days || []).includes(this.todayDOW()); }

  toggleSessionOpen(id: string): void { this.openSession = this.openSession === id ? null : id; }
  toggleDay(s: PlanSession, day: number): void {
    s.days = (s.days || []).includes(day) ? s.days.filter((d) => d !== day) : [...(s.days || []), day];
    this.planDirty = true;
  }
  addSession(): void {
    const id = this.uid('s');
    this.plan.sessions.push({ id, title: 'New session', est: '30 min', days: [], exercises: [] });
    this.openSession = id; this.planDirty = true;
  }
  removeSession(id: string): void { this.plan.sessions = this.plan.sessions.filter((s) => s.id !== id); this.planDirty = true; }
  addExercise(s: PlanSession): void { s.exercises.push({ id: this.uid('e'), name: '', detail: '', video: '' }); this.planDirty = true; }
  removeExercise(s: PlanSession, eid?: string): void { s.exercises = s.exercises.filter((e) => e.id !== eid); this.planDirty = true; }
  markPlanDirty(): void { this.planDirty = true; }
  savePlan(): void {
    if (!this.selectedClient) return;
    this.api.adminSavePlan(this.selectedClient.id, this.plan).subscribe(() => (this.planDirty = false));
  }

  // ---- button styles ----
  private base(size: 'sm' | 'md') {
    const s = { sm: { fontSize: '14px', padding: '10px 16px' }, md: { fontSize: '15.5px', padding: '14px 22px' } };
    return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px', fontFamily: 'inherit',
      fontWeight: '600', border: '1px solid transparent', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
      whiteSpace: 'nowrap', ...s[size] };
  }
  primaryBtn(size: 'sm' | 'md' = 'md') { return { ...this.base(size), background: 'var(--accent)', color: 'var(--accent-ink)' }; }
  darkBtn(size: 'sm' | 'md' = 'md') { return { ...this.base(size), background: 'var(--primary)', color: 'var(--primary-ink)' }; }
  ghostBtn(size: 'sm' | 'md' = 'sm') { return { ...this.base(size), background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }; }

  // ---- card / misc styles ----
  card(pad = 24) {
    return { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: pad + 'px' };
  }
  cardMuted(pad = 24) { return { background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: pad + 'px' }; }
  cardTitleRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' };
  cardTitle = { fontFamily: 'var(--headline-font)', fontSize: '18px', fontWeight: '600', color: 'var(--ink)', margin: '0', letterSpacing: '-.01em' };
  linkBtn = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: 'var(--accent)', padding: '0' };
  metaK = { fontSize: '12px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' };
  metaV = { fontSize: '14.5px', fontWeight: '600', color: 'var(--ink)' };
  planInput = { fontFamily: 'inherit', fontSize: '14px', padding: '8px 11px', borderRadius: '9px', border: '1px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink)', outline: 'none', width: '100%', boxSizing: 'border-box' };
  lbl = { display: 'block', fontSize: '13.5px', fontWeight: '600', color: 'var(--ink)', marginBottom: '7px' };

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
