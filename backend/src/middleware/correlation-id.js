/**
 * correlation-id.js — Attaches a unique correlation ID to every request (R43)
 * Uses the incoming X-Correlation-Id header if present (for client-side tracing),
 * otherwise generates a new UUID v4.
 * Sets the X-Correlation-Id response header so clients/log aggregators can correlate.
 */
const { v4: uuidv4 } = require('uuid');

function correlationId(req, res, next) {
  const id = req.header('x-correlation-id') || uuidv4();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}

module.exports = { correlationId };
