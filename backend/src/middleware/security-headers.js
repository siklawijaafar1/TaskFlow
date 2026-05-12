/**
 * security-headers.js — Helmet configuration (R31)
 * Mounted FIRST in app.js before any route.
 */
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"], // allow inline styles for now
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  // HSTS only in production (R31)
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  frameguard:    { action: 'deny' },
  noSniff:       true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

module.exports = { securityHeaders };
