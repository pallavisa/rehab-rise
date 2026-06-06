import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { pool, query } from './db.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const app = express();

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { member_name, member_email, program_id } = session.metadata || {};
    if (member_name && member_email && program_id) {
      try {
        const programs = await query('SELECT * FROM programs WHERE id=?', [program_id]);
        if (programs.length) {
          const program = programs[0];
          const password = genPassword();
          const hash = await bcrypt.hash(password, 10);
          const joined = new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' });
          let memberId;
          const existing = await query('SELECT id FROM members WHERE email=?', [member_email]);
          if (existing.length) {
            memberId = existing[0].id;
            await query('UPDATE members SET name=?, password_hash=? WHERE id=?', [member_name, hash, memberId]);
          } else {
            const r = await query(
              'INSERT INTO members (name,email,password_hash,is_admin,status,joined) VALUES (?,?,?,0,?,?)',
              [member_name, member_email, hash, 'Active', joined]);
            memberId = r.insertId;
          }
          const renews = new Date(); renews.setMonth(renews.getMonth() + 1);
          await query('INSERT INTO subscriptions (member_id,program_id,amount,status,renews_at) VALUES (?,?,?,?,?)',
            [memberId, program_id, program.price, 'active', renews.toISOString().slice(0, 10)]);
          await query('INSERT INTO payments (member_id,receipt,period,amount,status,paid_on) VALUES (?,?,?,?,?,?)',
            [memberId, 'RCT-' + Date.now().toString().slice(-5),
             new Date().toLocaleString('en-GB', { month: 'long' }),
             program.price, 'Paid', new Date().toISOString().slice(0, 10)]);
        }
      } catch (e) { console.error('Webhook handler error:', e.message); }
    }
  }
  res.json({ received: true });
});

app.use(express.json());
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:4200')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ---- helpers --------------------------------------------------------------
function meetCode(name, date, time) {
  const slug = (name || 'rr').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3) || 'rnr';
  return `meet.google.com/${slug}-rise-${(date || '000').slice(-2)}${(time || '00').replace(':', '')}`;
}
function genPassword() {
  return Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6);
}
function programRow(r) {
  return {
    id: r.id, name: r.name, tag: r.tag, price: r.price, cadence: r.cadence, summary: r.summary,
    features: typeof r.features === 'string' ? JSON.parse(r.features) : (r.features || []),
    saving: r.saving, accent: !!r.is_accent, bundle: !!r.is_bundle, active: !!r.is_active,
    sortOrder: r.sort_order,
  };
}
function sign(m) { return jwt.sign({ id: m.id, email: m.email, admin: !!m.is_admin }, JWT_SECRET, { expiresIn: '7d' }); }

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}
function adminOnly(req, res, next) {
  if (!req.user?.admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// ===========================================================================
// AUTH
// ===========================================================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const rows = await query('SELECT * FROM members WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const m = rows[0];
    res.json({ ok: true, token: sign(m), member: { id: m.id, name: m.name, email: m.email, isAdmin: !!m.is_admin } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', auth, async (req, res) => {
  const rows = await query('SELECT id,name,email,is_admin FROM members WHERE id=?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ id: rows[0].id, name: rows[0].name, email: rows[0].email, isAdmin: !!rows[0].is_admin });
});

// ===========================================================================
// PROGRAMS  (public read; admin CRUD → reflects on public site)
// ===========================================================================
app.get('/api/programs', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM programs WHERE is_active=1 ORDER BY sort_order ASC');
    res.json(rows.map(programRow));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin sees all (incl. inactive)
app.get('/api/admin/programs', auth, adminOnly, async (_req, res) => {
  const rows = await query('SELECT * FROM programs ORDER BY sort_order ASC');
  res.json(rows.map(programRow));
});

app.post('/api/admin/programs', auth, adminOnly, async (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.name || b.price == null) return res.status(400).json({ error: 'id, name, price required' });
  try {
    const existing = await query('SELECT id FROM programs WHERE id=?', [b.id]);
    if (existing.length) return res.status(409).json({ error: 'A program with that id already exists' });
    const maxRow = await query('SELECT COALESCE(MAX(sort_order),0) AS m FROM programs');
    await query(
      `INSERT INTO programs (id,name,tag,price,cadence,summary,features,saving,is_accent,is_bundle,is_active,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.id, b.name, b.tag || null, b.price, b.cadence || '/ month', b.summary || null,
       JSON.stringify(b.features || []), b.saving || null,
       b.accent ? 1 : 0, b.bundle ? 1 : 0, b.active === false ? 0 : 1, (maxRow[0].m || 0) + 1]
    );
    const row = await query('SELECT * FROM programs WHERE id=?', [b.id]);
    res.status(201).json(programRow(row[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/programs/:id', auth, adminOnly, async (req, res) => {
  const b = req.body || {};
  try {
    const existing = await query('SELECT id FROM programs WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Program not found' });
    await query(
      `UPDATE programs SET name=?,tag=?,price=?,cadence=?,summary=?,features=?,saving=?,is_accent=?,is_bundle=?,is_active=? WHERE id=?`,
      [b.name, b.tag || null, b.price, b.cadence || '/ month', b.summary || null,
       JSON.stringify(b.features || []), b.saving || null,
       b.accent ? 1 : 0, b.bundle ? 1 : 0, b.active === false ? 0 : 1, req.params.id]
    );
    const row = await query('SELECT * FROM programs WHERE id=?', [req.params.id]);
    res.json(programRow(row[0]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/programs/:id', auth, adminOnly, async (req, res) => {
  try {
    await query('DELETE FROM programs WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================================================================
// AVAILABILITY
// ===========================================================================
app.get('/api/availability', async (_req, res) => {
  try {
    const rows = await query('SELECT slot_date, slot_time, is_taken FROM availability_slots ORDER BY slot_date, slot_time');
    const byDate = {};
    for (const r of rows) (byDate[r.slot_date] ||= []).push({ time: r.slot_time, taken: !!r.is_taken });
    res.json(byDate);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Weekly template (admin reads & edits)
app.get('/api/admin/availability-template', auth, adminOnly, async (_req, res) => {
  const rows = await query('SELECT weekday, slot_time, is_open FROM availability_template');
  const grid = {};
  for (const r of rows) (grid[r.weekday] ||= {})[r.slot_time] = !!r.is_open;
  res.json(grid);
});

app.put('/api/admin/availability-template', auth, adminOnly, async (req, res) => {
  const grid = req.body?.grid || {};
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const wd of Object.keys(grid))
      for (const t of Object.keys(grid[wd]))
        await conn.query(
          'INSERT INTO availability_template (weekday,slot_time,is_open) VALUES (?,?,?) ON DUPLICATE KEY UPDATE is_open=?',
          [wd, t, grid[wd][t] ? 1 : 0, grid[wd][t] ? 1 : 0]
        );
    // Regenerate concrete future slots from the template (preserve booked ones).
    const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [taken] = await conn.query('SELECT slot_date, slot_time FROM availability_slots WHERE is_taken=1');
    const takenSet = new Set(taken.map((r) => `${r.slot_date}-${r.slot_time}`));
    await conn.query('DELETE FROM availability_slots WHERE is_taken=0 AND slot_date >= ?', [today.toISOString().slice(0, 10)]);
    for (let d = 1; d <= 26; d++) {
      const date = new Date(today); date.setDate(today.getDate() + d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const wd = WEEK_DAYS[dow - 1];
      const key = date.toISOString().slice(0, 10);
      for (const t of Object.keys(grid[wd] || {})) {
        if (grid[wd][t] && !takenSet.has(`${key}-${t}`)) {
          await conn.query(
            'INSERT INTO availability_slots (slot_date,slot_time,is_taken) VALUES (?,?,0) ON DUPLICATE KEY UPDATE is_taken=is_taken',
            [key, t]
          );
        }
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// ===========================================================================
// BOOKINGS
// ===========================================================================
app.post('/api/bookings', async (req, res) => {
  const { date, time, name, email, phone, program, note } = req.body || {};
  if (!date || !time || !name || !email || !phone) return res.status(400).json({ error: 'Missing required fields' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [slots] = await conn.query(
      'SELECT id, is_taken FROM availability_slots WHERE slot_date=? AND slot_time=? FOR UPDATE', [date, time]);
    if (!slots.length) { await conn.rollback(); return res.status(404).json({ error: 'Slot not found' }); }
    if (slots[0].is_taken) { await conn.rollback(); return res.status(409).json({ error: 'Slot already taken' }); }
    const link = meetCode(name, date, time);
    await conn.query(
      `INSERT INTO bookings (slot_id,name,email,phone,program,note,meet_link,status) VALUES (?,?,?,?,?,?,?, 'new')`,
      [slots[0].id, name, email, phone, program || 'Not sure yet', note || null, link]);
    await conn.query('UPDATE availability_slots SET is_taken=1 WHERE id=?', [slots[0].id]);
    await conn.commit();
    res.status(201).json({ ok: true, date, time, meetLink: link });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

app.get('/api/admin/bookings', auth, adminOnly, async (_req, res) => {
  const rows = await query(
    `SELECT b.*, s.slot_date, s.slot_time FROM bookings b
     JOIN availability_slots s ON s.id=b.slot_id ORDER BY s.slot_date, s.slot_time`);
  res.json(rows.map((b) => ({
    id: b.id, name: b.name, email: b.email, phone: b.phone, interest: b.program,
    note: b.note, meet: b.meet_link, status: b.status,
    start: `${b.slot_date}T${b.slot_time}:00`, mins: 15,
  })));
});

app.post('/api/admin/bookings/:id/confirm', auth, adminOnly, async (req, res) => {
  await query("UPDATE bookings SET status='confirmed' WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// ===========================================================================
// SUBSCRIBE  (public — creates member + subscription + first payment)
// ===========================================================================
app.post('/api/subscribe', async (req, res) => {
  const { name, email, programId } = req.body || {};
  if (!name || !email || !programId) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const programs = await query('SELECT * FROM programs WHERE id=?', [programId]);
    if (!programs.length) return res.status(404).json({ error: 'Program not found' });
    const program = programs[0];
    const password = genPassword();
    const hash = await bcrypt.hash(password, 10);
    const joined = new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' });

    let memberId;
    const existing = await query('SELECT id FROM members WHERE email=?', [email]);
    if (existing.length) {
      memberId = existing[0].id;
      await query('UPDATE members SET name=?, password_hash=? WHERE id=?', [name, hash, memberId]);
    } else {
      const r = await query('INSERT INTO members (name,email,password_hash,is_admin,status,joined) VALUES (?,?,?,0,?,?)',
        [name, email, hash, 'Active', joined]);
      memberId = r.insertId;
    }
    const renews = new Date(); renews.setMonth(renews.getMonth() + 1);
    await query('INSERT INTO subscriptions (member_id,program_id,amount,status,renews_at) VALUES (?,?,?,?,?)',
      [memberId, programId, program.price, 'active', renews.toISOString().slice(0, 10)]);
    await query('INSERT INTO payments (member_id,receipt,period,amount,status,paid_on) VALUES (?,?,?,?,?,?)',
      [memberId, 'RCT-' + Date.now().toString().slice(-5), new Date().toLocaleString('en-GB', { month: 'long' }),
       program.price, 'Paid', new Date().toISOString().slice(0, 10)]);
    res.status(201).json({ ok: true, program: program.name, email, devPassword: password });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================================================================
// ADMIN — clients
// ===========================================================================
async function clientPayload(m) {
  const subs = await query(
    `SELECT s.*, p.name AS program_name, p.tag FROM subscriptions s
     JOIN programs p ON p.id=s.program_id WHERE s.member_id=? ORDER BY s.started_at DESC LIMIT 1`, [m.id]);
  const files = await query('SELECT * FROM files WHERE member_id=? ORDER BY added_at ASC', [m.id]);
  const next = await query(
    "SELECT * FROM sessions WHERE member_id=? AND status='upcoming' ORDER BY starts_at ASC LIMIT 1", [m.id]);
  const planRow = await query('SELECT plan FROM training_plans WHERE member_id=?', [m.id]);
  const initials = m.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return {
    id: m.id, name: m.name, email: m.email, phone: m.phone, status: m.status,
    joined: m.joined, note: m.note, avatar: initials,
    program: subs[0]?.program_name || '—', tag: subs[0]?.tag || '',
    paid: subs[0] ? new Date(subs[0].started_at).toLocaleString('en-GB', { month: 'short' }) : '—',
    nextSession: next[0] ? next[0].starts_at : null,
    files: files.map((f) => ({
      id: f.id, name: f.name, kind: f.kind, size: humanSize(f.size_bytes), ext: f.ext,
      added: f.added_at, category: f.category,
    })),
    plan: planRow[0] ? (typeof planRow[0].plan === 'string' ? JSON.parse(planRow[0].plan) : planRow[0].plan) : { sessions: [] },
  };
}
function humanSize(bytes) {
  bytes = Number(bytes) || 0;
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

app.get('/api/admin/clients', auth, adminOnly, async (_req, res) => {
  const rows = await query('SELECT * FROM members WHERE is_admin=0 ORDER BY name');
  const out = [];
  for (const m of rows) out.push(await clientPayload(m));
  res.json(out);
});

app.get('/api/admin/clients/:id', auth, adminOnly, async (req, res) => {
  const rows = await query('SELECT * FROM members WHERE id=? AND is_admin=0', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Client not found' });
  res.json(await clientPayload(rows[0]));
});

app.put('/api/admin/clients/:id/note', auth, adminOnly, async (req, res) => {
  await query('UPDATE members SET note=? WHERE id=?', [req.body?.note || '', req.params.id]);
  res.json({ ok: true });
});

// Stats for overview
app.get('/api/admin/stats', auth, adminOnly, async (_req, res) => {
  const active = await query("SELECT COUNT(*) c FROM members WHERE is_admin=0 AND status='Active'");
  const newB = await query("SELECT COUNT(*) c FROM bookings WHERE status='new'");
  const weekSess = await query(
    "SELECT COUNT(*) c FROM sessions WHERE starts_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)");
  const rev = await query(
    "SELECT COALESCE(SUM(amount),0) s FROM payments WHERE MONTH(paid_on)=MONTH(NOW()) AND YEAR(paid_on)=YEAR(NOW())");
  res.json([
    { label: 'Active clients', value: String(active[0].c), icon: 'user', note: 'subscribed' },
    { label: 'New bookings', value: String(newB[0].c), icon: 'bell', note: 'Awaiting confirmation' },
    { label: 'Sessions this week', value: String(weekSess[0].c), icon: 'calendar', note: 'next 7 days' },
    { label: 'Revenue · this month', value: '£' + rev[0].s, icon: 'card', note: 'paid' },
  ]);
});

// ===========================================================================
// FILES — real upload/download per member
// ===========================================================================
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 200 * 1024 * 1024 } });

function categorise(ext) {
  if (ext === 'mp4' || ext === 'mov') return 'video';
  return 'plan';
}

app.post('/api/admin/clients/:id/files', auth, adminOnly, upload.array('files'), async (req, res) => {
  try {
    const created = [];
    for (const f of req.files || []) {
      const ext = (f.originalname.split('.').pop() || 'file').toLowerCase();
      const r = await query(
        `INSERT INTO files (member_id,name,kind,category,ext,size_bytes,stored_name,is_new)
         VALUES (?,?,?,?,?,?,?,1)`,
        [req.params.id, f.originalname, req.body.kind || 'Shared file', categorise(ext), ext, f.size, f.filename]);
      created.push({ id: r.insertId, name: f.originalname, kind: req.body.kind || 'Shared file',
        size: humanSize(f.size), ext, added: new Date().toISOString(), category: categorise(ext) });
    }
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/files/:fileId', auth, adminOnly, async (req, res) => {
  const rows = await query('SELECT stored_name FROM files WHERE id=?', [req.params.fileId]);
  if (rows.length) { try { fs.unlinkSync(path.join(UPLOAD_DIR, rows[0].stored_name)); } catch {} }
  await query('DELETE FROM files WHERE id=?', [req.params.fileId]);
  res.json({ ok: true });
});

// Download — member can fetch own files; admin can fetch any
app.get('/api/files/:fileId/download', auth, async (req, res) => {
  const rows = await query('SELECT * FROM files WHERE id=?', [req.params.fileId]);
  if (!rows.length) return res.status(404).json({ error: 'File not found' });
  const f = rows[0];
  if (!req.user.admin && f.member_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await query('UPDATE files SET is_new=0 WHERE id=?', [f.id]);
  res.download(path.join(UPLOAD_DIR, f.stored_name), f.name);
});

// ===========================================================================
// TRAINING PLANS
// ===========================================================================
app.put('/api/admin/clients/:id/plan', auth, adminOnly, async (req, res) => {
  const plan = req.body?.plan;
  if (!plan) return res.status(400).json({ error: 'plan required' });
  await query(
    'INSERT INTO training_plans (member_id,plan) VALUES (?,?) ON DUPLICATE KEY UPDATE plan=VALUES(plan)',
    [req.params.id, JSON.stringify(plan)]);
  res.json({ ok: true });
});

// ===========================================================================
// MEMBER dashboard data (own data only)
// ===========================================================================
app.get('/api/member/overview', auth, async (req, res) => {
  try {
    const m = (await query('SELECT * FROM members WHERE id=?', [req.user.id]))[0];
    if (!m) return res.status(404).json({ error: 'Not found' });
    const sub = (await query(
      `SELECT s.*, p.name program_name, p.tag, p.cadence FROM subscriptions s
       JOIN programs p ON p.id=s.program_id WHERE s.member_id=? ORDER BY s.started_at DESC LIMIT 1`, [req.user.id]))[0];
    const sessions = await query('SELECT * FROM sessions WHERE member_id=? ORDER BY starts_at', [req.user.id]);
    const files = await query('SELECT * FROM files WHERE member_id=? ORDER BY added_at DESC', [req.user.id]);
    const payments = await query('SELECT * FROM payments WHERE member_id=? ORDER BY paid_on DESC', [req.user.id]);
    const planRow = await query('SELECT plan FROM training_plans WHERE member_id=?', [req.user.id]);
    res.json({
      member: { id: m.id, name: m.name, first: m.name.split(' ')[0], email: m.email, joined: m.joined, coach: 'Jordan Reeve' },
      program: sub ? { name: sub.program_name, tag: sub.tag, price: sub.amount, cadence: sub.cadence,
        status: sub.status, renewsAt: sub.renews_at } : null,
      sessions: sessions.map((s) => ({
        id: s.id, title: s.title, type: s.type, start: s.starts_at, mins: s.mins,
        meet: s.meet_link, status: s.status })),
      files: files.map((f) => ({
        id: f.id, name: f.name, kind: f.kind, size: humanSize(f.size_bytes), ext: f.ext,
        added: f.added_at, isNew: !!f.is_new, cat: f.category })),
      payments: payments.map((p) => ({
        id: p.receipt, date: p.paid_on, amount: p.amount, status: p.status, period: p.period })),
      plan: planRow[0] ? (typeof planRow[0].plan === 'string' ? JSON.parse(planRow[0].plan) : planRow[0].plan) : { sessions: [] },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===========================================================================
// STRIPE CHECKOUT
// ===========================================================================
app.post('/api/create-checkout-session', async (req, res) => {
  const { name, email, programId } = req.body || {};
  if (!name || !email || !programId) return res.status(400).json({ error: 'name, email, programId required' });
  try {
    const programs = await query('SELECT * FROM programs WHERE id=?', [programId]);
    if (!programs.length) return res.status(404).json({ error: 'Program not found' });
    const program = programs[0];
    const origin = (req.headers.origin || ALLOWED_ORIGINS[0]).replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: program.name,
            description: program.summary || `One month of ${program.name}`,
          },
          unit_amount: Math.round(Number(program.price) * 100),
        },
        quantity: 1,
      }],
      metadata: { member_name: name, member_email: email, program_id: programId },
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Rehab & Rise API on :${PORT}`));
