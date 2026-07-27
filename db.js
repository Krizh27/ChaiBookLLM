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
    // Automatic schema migration for Clerk Authentication support and Transparency System
    await pool.query('ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);');
    await pool.query('ALTER TABLE sources ADD COLUMN IF NOT EXISTS quality_score VARCHAR(30) DEFAULT \'good\';');
    await pool.query('ALTER TABLE sources ADD COLUMN IF NOT EXISTS quality_reason TEXT;');
    await pool.query('ALTER TABLE sources ADD COLUMN IF NOT EXISTS indexing_summary JSONB;');
    console.log('Verified schema columns in notebooks and sources tables.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}

testConnection();

export const query = (text, params) => pool.query(text, params);
export default { query };
