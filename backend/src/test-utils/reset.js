/**
 * reset.js — Test-only DB reset endpoint (E2E isolation, R35)
 * Mounted at /api/test ONLY when NODE_ENV === 'test_e2e'.
 * POST /api/test/reset-db: truncates all tables and re-seeds fixtures.
 *
 * This endpoint MUST NOT exist in production (R33).
 * The guard in app.js (NODE_ENV check) enforces this.
 */
const express = require('express');
const db      = require('../database/db');

const router = express.Router();

router.post('/reset-db', async (req, res) => {
  try {
    // Truncate all tables in dependency order (FK constraints)
    await db.raw(`
      TRUNCATE TABLE tasks, projects, users, organizations
      RESTART IDENTITY CASCADE
    `);

    // Seed minimal fixtures: 1 organization (no users — test creates them)
    await db('organizations').insert({
      id:         db.raw('uuid_generate_v4()'),
      name:       'Test Organization',
      slug:       'test-org',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    res.json({ ok: true, message: 'Database reset to clean state.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
