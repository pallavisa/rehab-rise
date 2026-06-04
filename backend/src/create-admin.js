import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node src/create-admin.js <email> <password>');
  process.exit(1);
}

async function run() {
  // Remove all demo/seed data
  console.log('Removing demo accounts...');
  await query('DELETE FROM members WHERE is_admin=0');
  await query("DELETE FROM members WHERE email IN ('jordan@rehabandrise.com','rupesh.sashte@gmail.com')");

  // Create real admin
  console.log('Creating admin account...');
  const hash = await bcrypt.hash(password, 10);
  const joined = new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' });
  await query(
    `INSERT INTO members (name, email, password_hash, is_admin, status, joined)
     VALUES (?, ?, ?, 1, 'Active', ?)`,
    ['Admin', email, hash, joined]
  );

  console.log(`✓ Admin created: ${email}`);
  console.log('✓ All demo accounts removed');
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
