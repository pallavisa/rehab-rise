import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { BookingModalComponent } from './booking-modal.component';
import { CheckoutModalComponent } from './checkout-modal.component';
import { LoginModalComponent } from './login-modal.component';
import { ApiService } from '../services/api.service';
import { Program } from '../services/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, IconComponent, BookingModalComponent, CheckoutModalComponent, LoginModalComponent],
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit {
  programs: Program[] = [];
  scrolled = false;
  navOpen = false;
  openFaq = 0;
  year = new Date().getFullYear();

  booking = false;
  login = false;
  checkout: Program | null = null;

  navLinks = [
    { label: 'Programs', id: 'programs' },
    { label: 'How it works', id: 'how' },
    { label: 'About', id: 'about' },
    { label: 'Stories', id: 'stories' },
  ];
  trustItems = [
    { icon: 'shield', label: 'Chartered & insured practitioner' },
    { icon: 'video', label: '1-to-1 video, never generic plans' },
    { icon: 'leaf', label: 'Evidence-based, no fads' },
    { icon: 'clock', label: 'No long lock-in — monthly' },
  ];
  steps = [
    { n: '01', title: 'Book a free 15-min call', body: "We talk through where you are, where you want to be, and whether we're a good fit. No pressure, no cost." },
    { n: '02', title: 'Get your tailored plan', body: 'I build a program around your body, history, and goals — delivered straight to your dashboard.' },
    { n: '03', title: 'Train with real support', body: 'Follow guided sessions, message me between check-ins, and adjust as your body responds.' },
    { n: '04', title: 'Track your rise', body: 'See your progress week over week — strength, mobility, and the milestones that actually matter to you.' },
  ];
  creds = ['MSc Sports Rehabilitation', 'Chartered Physiotherapist', 'Certified Strength Coach', 'Registered Nutrition Coach'];
  testimonials = [
    { quote: "Eight months after my knee reconstruction I'm back running. The weekly adjustments made it feel like someone genuinely had my back the whole way.", name: 'Marcus T.', detail: 'ACL recovery' },
    { quote: "I'd tried every diet going. This was the first time someone built something around my life instead of the other way round. Down 11kg and it stuck.", name: 'Priya R.', detail: 'Nutrition Reset' },
    { quote: "I came in barely able to lift my shoulder overhead. The progressions were so gradual I never felt at risk — and now I'm stronger than before the injury.", name: 'Dani K.', detail: 'Strength & Movement' },
  ];
  faqs = [
    { q: 'Is the free 15-minute call really free?', a: "Completely. It's a relaxed video call to understand your situation and see if working together makes sense. You'll get a Google Meet link by email as soon as you book." },
    { q: 'Do I need any equipment?', a: "Not to start. Plans are built around what you have access to — whether that's a full gym or a living-room floor — and scale up as you progress." },
    { q: 'Can I combine programs?', a: 'Yes. Most people see the best results combining rehab or training with nutrition — The Full Reset bundles all three at a reduced rate.' },
    { q: 'How do I get my exercise and nutrition plans?', a: 'Everything lives in your private dashboard. After you join, your plans, videos, and progress reports are attached there and updated as you go.' },
    { q: 'What if I need to cancel or reschedule?', a: "There's nothing to cancel — you pay month to month, so if you need a break you simply don't renew. We never store your card. You can reschedule any session from your dashboard up to 12 hours before." },
  ];

  iconFor: Record<string, string> = { rehab: 'leaf', strength: 'dumbbell', nutrition: 'spark' };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getPrograms().subscribe((p) => (this.programs = p));
  }

  get cards(): Program[] { return this.programs.filter((p) => !p.bundle); }
  get bundle(): Program | undefined { return this.programs.find((p) => p.bundle); }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 12; }

  go(id: string): void {
    this.navOpen = false;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  scrollTop(e: Event): void { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  toggleFaq(i: number): void { this.openFaq = this.openFaq === i ? -1 : i; }

  openCheckout(p: Program): void { this.checkout = p; }
  afterCheckout(): void { this.checkout = null; this.login = true; }
  checkoutToBooking(): void { this.checkout = null; this.booking = true; }

  // ---- Button styling (ported from ui.jsx Button) ----
  private base(size: 'sm' | 'md' | 'lg') {
    const sizes = {
      sm: { fontSize: '14px', padding: '10px 16px' },
      md: { fontSize: '15.5px', padding: '14px 22px' },
      lg: { fontSize: '17px', padding: '17px 30px' },
    };
    return {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
      fontFamily: 'inherit', fontWeight: '600', border: '1px solid transparent',
      borderRadius: 'var(--radius-pill)', cursor: 'pointer', textDecoration: 'none', lineHeight: '1',
      transition: 'transform .15s ease, background .2s ease, box-shadow .2s ease, color .2s ease',
      whiteSpace: 'nowrap', ...sizes[size],
    };
  }
  primaryBtn(size: 'sm' | 'md' | 'lg' = 'md') {
    return { ...this.base(size), background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' };
  }
  darkBtn(size: 'sm' | 'md' | 'lg' = 'md') {
    return { ...this.base(size), background: 'var(--primary)', color: 'var(--primary-ink)' };
  }
  outlineBtn(size: 'sm' | 'md' | 'lg' = 'md') {
    return { ...this.base(size), background: 'transparent', color: 'var(--ink)', borderColor: 'var(--line)' };
  }
}
