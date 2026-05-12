/**
 * logger.js — Pino structured JSON logger (R42)
 * - Production: JSON output (default Pino behaviour)
 * - Development: pretty-printed via pino-pretty
 * - Level controlled by LOG_LEVEL env var (default: info)
 */
const pino = require('pino');

const isDev = (process.env.NODE_ENV || 'development') === 'development';
const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize:    true,
        translateTime: 'SYS:HH:MM:ss',
        ignore:      'pid,hostname',
      },
    }
  : undefined;

const logger = pino(
  {
    level,
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  },
  transport ? pino.transport(transport) : undefined,
);

module.exports = logger;
