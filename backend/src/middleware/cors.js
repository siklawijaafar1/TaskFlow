/**
 * cors.js — CORS configuration with explicit allow-list (R32)
 * CORS_ORIGIN env var: comma-separated list of allowed origins.
 * In production, fails loudly if not set.
 */
const cors = require('cors');

function buildCorsMiddleware() {
  const env = process.env.NODE_ENV || 'development';

  let allowedOrigins;

  if (env === 'production') {
    if (!process.env.CORS_ORIGIN) {
      throw new Error('CORS_ORIGIN environment variable is required in production.');
    }
    allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
  } else {
    // In dev/test: allow localhost variants
    const fromEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
    allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      ...fromEnv.split(',').map((o) => o.trim()).filter(Boolean),
    ];
  }

  return cors({
    origin: (origin, callback) => {
      // Allow requests without origin (same-origin, curl, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed.`));
    },
    credentials: true, // needed for httpOnly cookie to be sent
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  });
}

module.exports = { buildCorsMiddleware };
