import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('neon.tech'))
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL at:', res.rows[0].now);
    // Automatic schema migration for Clerk Authentication support
    await pool.query('ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);');
    console.log('Verified user_id column in notebooks table.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}

testConnection();

export const query = (text, params) => pool.query(text, params);
export default { query };
