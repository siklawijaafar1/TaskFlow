/**
 * app.js — Express application bootstrap
 * Middleware order (important):
 *   1. correlationId   — FIRST: tag every request (R43)
 *   2. securityHeaders — Helmet headers (R31)
 *   3. cors            — CORS allow-list (R32)
 *   4. cookieParser    — parse cookies (needed for authenticate)
 *   5. json / urlencoded
 *   6. request logger  — structured Pino log per request (R42)
 *   7. healthcheck     — public, no auth (R39)
 *   8. apiLimiter      — global rate limit on /api/* (R29)
 *   9. routes          — business routes
 *  10. errorHandler    — LAST (R26)
 */
require('dotenv').config();

const express      = require('express');
const cookieParser = require('cookie-parser');

const { correlationId }      = require('./middleware/correlation-id');
const { securityHeaders }    = require('./middleware/security-headers');
const { buildCorsMiddleware } = require('./middleware/cors');
const { apiLimiter }         = require('./middleware/rate-limit');
const { errorHandler }       = require('./middleware/errorHandler');
const healthcheck             = require('./observability/healthcheck');
const routes                 = require('./routes');
const logger                 = require('./observability/logger');

const app = express();

// 1. Correlation ID — tag every request
app.use(correlationId);

// 2. Security headers
app.use(securityHeaders);

// 3. CORS
app.use(buildCorsMiddleware());

// 4. Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// 5. Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 6. Structured request logging (R42)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      correlation_id: req.correlationId,
      method:         req.method,
      url:            req.url,
      status:         res.statusCode,
      duration_ms:    Date.now() - start,
      user_id:        req.user?.id,
    }, 'request completed');
  });
  next();
});

// 7. Public healthcheck — BEFORE auth and rate limits
app.use(healthcheck);

// 8. Global API rate limit
app.use('/api', apiLimiter);

// 9. Business routes
app.use('/api/v1', routes);

// 10. Test-only reset endpoint (E2E isolation)
if (process.env.NODE_ENV === 'test_e2e') {
  // eslint-disable-next-line global-require
  const resetRouter = require('./test-utils/reset');
  app.use('/api/test', resetRouter);
}

// 11. Error handler — MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'TaskFlow API listening');
  });
}

module.exports = app;
