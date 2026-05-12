/**
 * healthcheck.js — GET /healthz endpoint (R39)
 * Returns 200 { status: 'ok' } when healthy.
 * Returns 503 { status: 'degraded' } if the DB ping fails.
 * Always public — mounted BEFORE auth middleware in app.js.
 */
const express = require('express');
const db      = require('../database/db');

const router = express.Router();

// eslint-disable-next-line import/no-dynamic-require
const { version } = require('../../package.json');

router.get('/healthz', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'ok';

  try {
    await db.raw('SELECT 1');
  } catch {
    dbStatus = 'unreachable';
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  const code   = status === 'ok' ? 200 : 503;

  return res.status(code).json({
    status,
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    version,
    db:        dbStatus,
    latency_ms: Date.now() - startTime,
  });
});

module.exports = router;
