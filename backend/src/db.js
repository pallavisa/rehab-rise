import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const socketPath = process.env.DB_SOCKET || '/tmp/mysql.sock';
export const pool = mysql.createPool({
  socketPath,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rehab_rise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
