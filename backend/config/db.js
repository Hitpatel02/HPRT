const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../utils/logger');

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual connection parameters if DATABASE_URL is not provided
  user: process.env.PGUSER || process.env.DB_USER,
  host: process.env.PGHOST || process.env.DB_HOST,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  port: process.env.PGPORT || process.env.DB_PORT,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20, // Maximum number of clients
});

// Add event listeners for connection issues
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// A more robust query function with retry logic
const query = async (text, params, retries = 3) => {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`DB query error (attempt ${attempt}/${retries}):`, error.message);
      lastError = error;

      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 2000); // Exponential backoff up to 2 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw lastError;
};

// Export the query method for easier use
module.exports = {
  query,
  pool
};
