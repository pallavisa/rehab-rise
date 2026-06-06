import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const [,, email, password, name = 'Client'] = process.argv;
if (!email || !password) {
  console.error('Usage: node src/create-client.js <email> <password> [name]');
  process.exit(1);
}

async function run() {
  const existing = await query('SELECT id FROM members WHERE email = ?', [email]);
  if (existing.length) {
    console.log(`Account already exists for ${email} — updating password.`);
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE members SET password_hash = ? WHERE email = ?', [hash, email]);
    console.log(`✓ Password updated for ${email}`);
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const joined = new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' });
  await query(
    `INSERT INTO members (name, email, password_hash, is_admin, status, joined)
     VALUES (?, ?, ?, 0, 'Active', ?)`,
    [name, email, hash, joined]
  );

  console.log(`✓ Client account created: ${email} (name: ${name})`);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
