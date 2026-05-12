/**
 * errorHandler.js — Centralized error handler (R26, R44)
 * Logs errors with correlation_id, user_id, organization_id (R44).
 * Returns safe, human-readable messages to the client (R26).
 */
const logger = require('../observability/logger');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Log with structured context (R44)
  const logCtx = {
    correlation_id:  req.correlationId,
    user_id:         req.user?.id,
    organization_id: req.user?.organizationId,
    err: {
      name:    err.name,
      message: err.message,
      stack:   err.stack,
    },
  };

  if (status >= 500) {
    logger.error(logCtx, 'Unhandled server error');
  } else if (status >= 400) {
    logger.warn(logCtx, 'Client error');
  }

  // Never expose internal details to the client (R26)
  if (status >= 500) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  // 422 with field-level errors (Joi format)
  if (err.errors) {
    return res.status(status).json({ error: err.message, errors: err.errors });
  }

  return res.status(status).json({ error: err.message });
}

function createError(status, message) {
  const err  = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };
