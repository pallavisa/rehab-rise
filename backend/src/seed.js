// Seeds programs, coach admin, sample clients (subscriptions, payments,
// sessions, plans, files metadata), availability template + concrete slots.
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const PROGRAMS = [
  { id: 'rehab', name: 'Recovery Rehab', tag: 'Rehabilitation', price: 120, cadence: '/ month',
    summary: 'Guided, progressive rehabilitation after injury or surgery — rebuild safely with a plan that adapts each week.',
    features: ['Personalised rehab protocol', 'Weekly progression review', 'Video-guided exercises', 'Direct message support'],
    is_accent: 0, is_bundle: 0, sort_order: 1 },
  { id: 'strength', name: 'Strength & Movement', tag: 'Training', price: 85, cadence: '/ month',
    summary: 'A 12-week progressive program to rebuild capacity, move well, and get genuinely stronger — at your pace.',
    features: ['Structured 12-week plan', 'Movement screening', 'Form check-ins', 'Mobile workout app'],
    is_accent: 1, is_bundle: 0, sort_order: 2 },
  { id: 'nutrition', name: 'Nutrition Reset', tag: 'Nutrition', price: 65, cadence: '/ month',
    summary: 'Personalised nutrition coaching that fits your real life — no fads, no rigid meal plans, just sustainable habits.',
    features: ['Tailored nutrition plan', 'Habit-based coaching', 'Fortnightly check-ins', 'Recipe & shopping guides'],
    is_accent: 0, is_bundle: 0, sort_order: 3 },
  { id: 'full', name: 'The Full Reset', tag: 'Bundle', price: 220, cadence: '/ month',
    summary: 'All three programs, fully integrated — rehab, training, and nutrition working together toward one goal.',
    features: ['Full programme access', 'Direct message support', 'Plans & files in your dashboard'],
    saving: 'Save £50 / month', is_accent: 0, is_bundle: 1, sort_order: 4 },
];

const TIME_ROWS = ['09:00', '09:30', '11:00', '13:30', '16:00', '17:30'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DEFAULT_AVAIL = {
  Mon: { '09:00': 1, '09:30': 1, '11:00': 1, '13:30': 0, '16:00': 1, '17:30': 1 },
  Tue: { '09:00': 1, '09:30': 0, '11:00': 1, '13:30': 1, '16:00': 1, '17:30': 0 },
  Wed: { '09:00': 0, '09:30': 0, '11:00': 1, '13:30': 1, '16:00': 1, '17:30': 1 },
  Thu: { '09:00': 1, '09:30': 1, '11:00': 0, '13:30': 1, '16:00': 1, '17:30': 1 },
  Fri: { '09:00': 1, '09:30': 1, '11:00': 1, '13:30': 1, '16:00': 0, '17:30': 0 },
};

function isoKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Generate concrete slots for the next ~3 weeks from the weekly template.
function slotsFromTemplate() {
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let d = 1; d <= 26; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const wd = WEEK_DAYS[dow - 1];
    TIME_ROWS.forEach((t) => {
      if (DEFAULT_AVAIL[wd][t]) out.push({ date: isoKey(date), time: t, taken: 0 });
    });
  }
  return out;
}

const SEED_PLAN = {
  sessions: [
    { id: 's1', title: 'Lower Body — Strength', est: '45 min', days: [1, 4], exercises: [
      { id: 'e1', name: 'Goblet Squat', detail: '4 × 8 · RPE 7', video: 'https://www.youtube.com/watch?v=MeIiIdhvXT4' },
      { id: 'e2', name: 'Romanian Deadlift', detail: '3 × 10 · RPE 7', video: 'https://www.youtube.com/watch?v=JCXUYuzwNrM' },
      { id: 'e3', name: 'Split Squat', detail: '3 × 10 each side', video: '' },
      { id: 'e4', name: 'Calf Raise', detail: '3 × 15', video: '' },
      { id: 'e5', name: 'Mobility cool-down', detail: '8 min routine', video: 'https://www.youtube.com/watch?v=2L2lnxIcNmo' },
    ] },
    { id: 's2', title: 'Upper Body — Push', est: '40 min', days: [2, 5], exercises: [
      { id: 'e6', name: 'Incline Press', detail: '4 × 8', video: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
      { id: 'e7', name: 'Half-Kneeling Press', detail: '3 × 10 each side', video: '' },
      { id: 'e8', name: 'Band Pull-apart', detail: '3 × 15', video: '' },
    ] },
    { id: 's3', title: 'Conditioning & Core', est: '30 min', days: [6], exercises: [
      { id: 'e9', name: 'Bike intervals', detail: '6 × 1 min hard', video: '' },
      { id: 'e10', name: 'Dead Bug', detail: '3 × 10 each side', video: 'https://www.youtube.com/watch?v=g_BYB0R-4Ws' },
    ] },
  ],
};

function at(addDays, h, m = 0) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + addDays); d.setHours(h, m, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function dateOnly(addDays) {
  const d = new Date(); d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}

async function run() {
  console.log('Programs…');
  await query('DELETE FROM programs');
  for (const p of PROGRAMS) {
    await query(
      `INSERT INTO programs (id,name,tag,price,cadence,summary,features,saving,is_accent,is_bundle,is_active,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
      [p.id, p.name, p.tag, p.price, p.cadence, p.summary, JSON.stringify(p.features),
       p.saving || null, p.is_accent, p.is_bundle, p.sort_order]
    );
  }

  console.log('Availability template + slots…');
  await query('DELETE FROM availability_template');
  for (const wd of WEEK_DAYS)
    for (const t of TIME_ROWS)
      await query('INSERT INTO availability_template (weekday,slot_time,is_open) VALUES (?,?,?)', [wd, t, DEFAULT_AVAIL[wd][t]]);
  await query('DELETE FROM availability_slots');
  for (const s of slotsFromTemplate())
    await query('INSERT INTO availability_slots (slot_date,slot_time,is_taken) VALUES (?,?,?)', [s.date, s.time, s.taken]);

  console.log('Members (coach + clients)…');
  await query('DELETE FROM members');
  const coachHash = await bcrypt.hash('coach123', 10);
  await query(
    `INSERT INTO members (name,email,phone,password_hash,is_admin,status,joined) VALUES (?,?,?,?,1,'Active',?)`,
    ['Jordan Reeve', 'jordan@rehabandrise.com', '+44 7700 900000', coachHash, 'Jan 2026']
  );

  const clientPass = await bcrypt.hash('member123', 10);
  const clients = [
    { name: 'Alex Morgan', email: 'alex.morgan@email.com', phone: '+44 7700 900142', status: 'Active', joined: 'Mar 2026', note: 'ACL recovery — progressing well, watch the knee niggle.', program: 'strength' },
    { name: 'Priya Raman', email: 'priya.r@email.com', phone: '+44 7700 900233', status: 'Active', joined: 'Apr 2026', note: 'Down 4kg. Wants more high-protein breakfast ideas.', program: 'nutrition' },
    { name: 'Dani Kove', email: 'dani.kove@email.com', phone: '+44 7700 900318', status: 'Active', joined: 'Feb 2026', note: 'Shoulder rehab complete — now strength-focused. Strong adherence.', program: 'full' },
    { name: 'Marcus Tate', email: 'm.tate@email.com', phone: '+44 7700 900401', status: 'Active', joined: 'May 2026', note: 'Post-op knee. Keep loads conservative for now.', program: 'rehab' },
    { name: 'Sophie Bell', email: 'sophie.bell@email.com', phone: '+44 7700 900566', status: 'Lapsed', joined: 'Jan 2026', note: "Completed first block — hasn't renewed since April. Worth a check-in.", program: 'strength' },
  ];
  const priceFor = { rehab: 120, strength: 85, nutrition: 65, full: 220 };
  const ids = {};
  for (const c of clients) {
    const r = await query(
      `INSERT INTO members (name,email,phone,password_hash,is_admin,status,note,joined) VALUES (?,?,?,?,0,?,?,?)`,
      [c.name, c.email, c.phone, clientPass, c.status, c.note, c.joined]
    );
    ids[c.email] = r.insertId;
    const renews = dateOnly(20);
    await query('INSERT INTO subscriptions (member_id,program_id,amount,status,renews_at) VALUES (?,?,?,?,?)',
      [r.insertId, c.program, priceFor[c.program], c.status === 'Active' ? 'active' : 'lapsed', renews]);
    // a few payments
    const months = [['RCT-0042', 'June', -2], ['RCT-0039', 'May', -33], ['RCT-0035', 'April', -63]];
    for (const [rcpt, period, days] of months)
      await query('INSERT INTO payments (member_id,receipt,period,amount,status,paid_on) VALUES (?,?,?,?,?,?)',
        [r.insertId, rcpt + '-' + r.insertId, period, priceFor[c.program], 'Paid', dateOnly(days)]);
  }

  console.log('Sessions for Alex…');
  const alex = ids['alex.morgan@email.com'];
  const sess = [
    ['Progress review & re-test', at(2, 9, 30), 30, 'meet.google.com/alx-rise-0930', 'upcoming'],
    ['Form check — lower body', at(9, 17, 0), 20, 'meet.google.com/alx-rise-1700', 'upcoming'],
    ['Nutrition check-in', at(-5, 13, 30), 15, 'meet.google.com/alx-rise-1330', 'done'],
    ['Week 4 review', at(-12, 9, 0), 30, 'meet.google.com/alx-rise-0900', 'done'],
  ];
  for (const [title, starts, mins, meet, status] of sess)
    await query('INSERT INTO sessions (member_id,title,type,starts_at,mins,meet_link,status) VALUES (?,?,?,?,?,?,?)',
      [alex, title, 'Video session', starts, mins, meet, status]);

  console.log('Training plan for Alex…');
  await query('DELETE FROM training_plans');
  await query('INSERT INTO training_plans (member_id,plan) VALUES (?,?)', [alex, JSON.stringify(SEED_PLAN)]);

  console.log('Done.');
  await pool.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
