export interface Program {
  id: string;
  name: string;
  tag: string;
  price: number;
  cadence: string;
  summary: string;
  features: string[];
  saving?: string;
  accent: boolean;
  bundle: boolean;
}

export interface Slot { time: string; taken: boolean; }
export type Availability = Record<string, Slot[]>;

export interface BookingResult { ok: boolean; date: string; time: string; meetLink: string; }
export interface SubscribeResult { ok: boolean; program: string; email: string; devPassword: string; }
export interface CheckoutSessionResult { url: string; }

// ---- Dashboard models -----------------------------------------------------
export interface AuthMember { id: number; name: string; email: string; isAdmin: boolean; }

export interface AdminProgram extends Program { active: boolean; sortOrder: number; }

export interface Exercise { id?: string; name: string; detail: string; video: string; }
export interface PlanSession { id: string; title: string; est: string; days: number[]; exercises: Exercise[]; }
export interface TrainingPlan { sessions: PlanSession[]; }

export interface ClientFile {
  id: number; name: string; kind: string; size: string; ext: string; added: string; category?: string; cat?: string; isNew?: boolean;
}
export interface Client {
  id: number; name: string; email: string; phone: string; status: string; joined: string;
  note: string; avatar: string; program: string; tag: string; paid: string;
  nextSession: string | null; files: ClientFile[]; plan: TrainingPlan;
}
export interface AdminBooking {
  id: number; name: string; email: string; phone: string; interest: string;
  note: string; meet: string; status: string; start: string; mins: number;
}
export interface Stat { label: string; value: string; icon: string; note: string; }

export interface MemberSession {
  id: number; title: string; type: string; start: string; mins: number; meet: string; status: string;
}
export interface MemberOverview {
  member: { id: number; name: string; first: string; email: string; joined: string; coach: string };
  program: { name: string; tag: string; price: number; cadence: string; status: string; renewsAt: string } | null;
  sessions: MemberSession[];
  files: ClientFile[];
  payments: { id: string; date: string; amount: number; status: string; period: string }[];
  plan: TrainingPlan;
}
