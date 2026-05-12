/**
 * rate-limit.js — Express rate limiting middleware (R29)
 *
 * authLimiter  : 5 attempts / 15 min per IP  → auth endpoints
 * apiLimiter   : 100 requests / 15 min per IP → all /api/* routes
 *
 * In test environments, the `skip` function bypasses rate limiting entirely.
 * `skip` is evaluated at request time (not module load time) so it works
 * correctly even in --runInBand Jest mode where modules are shared.
 */
const rateLimit = require('express-rate-limit');

function isTestEnv() {
  return ['test', 'test_e2e'].includes(process.env.NODE_ENV);
}

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => isTestEnv(), // bypass in all test environments
  handler: (req, res) => {
    const resetTime = req.rateLimit?.resetTime;
    const retryAfter = resetTime
      ? Math.ceil((resetTime - Date.now()) / 1000)
      : 900;
    res.status(429).json({
      status:      429,
      error:       'rate_limit_exceeded',
      message:     'Too many attempts. Please try again later.',
      retry_after: retryAfter > 0 ? retryAfter : 900,
    });
  },
});

const apiLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => isTestEnv(),
  handler: (req, res) => {
    res.status(429).json({
      status:  429,
      error:   'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
    });
  },
});

module.exports = { authLimiter, apiLimiter };
