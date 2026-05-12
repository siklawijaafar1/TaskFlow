/**
 * redis.js — Redis client wrapper using ioredis (R42, R55)
 * Lazy-connected on first use.
 * Values are JSON-serialized.
 * Falls back gracefully if Redis is unavailable (degraded mode).
 */
const Redis  = require('ioredis');
const logger = require('../observability/logger');

let client = null;

function getClient() {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

  if (!url) {
    logger.warn('No Redis URL configured — cache disabled (degraded mode).');
    return null;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck:     false,
    lazyConnect:          true,
    tls:                  url.startsWith('rediss://') ? {} : undefined,
  });

  client.on('error', (err) => {
    logger.warn({ err: err.message }, 'Redis connection error — operating without cache.');
  });

  client.on('connect', () => {
    logger.info('Redis connected.');
  });

  return client;
}

async function get(key) {
  const c = getClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    if (raw === null) {
      logger.debug({ key }, 'cache miss');
      return null;
    }
    logger.debug({ key }, 'cache hit');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Redis get error');
    return null;
  }
}

async function set(key, value, ttlSeconds = 60) {
  const c = getClient();
  if (!c) return;
  try {
    await c.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Redis set error');
  }
}

async function del(key) {
  const c = getClient();
  if (!c) return;
  try {
    await c.del(key);
  } catch (err) {
    logger.warn({ err: err.message, key }, 'Redis del error');
  }
}

async function delByPattern(pattern) {
  const c = getClient();
  if (!c) return;
  try {
    const keys = await c.keys(pattern);
    if (keys.length > 0) {
      await c.del(...keys);
      logger.debug({ pattern, count: keys.length }, 'cache invalidated by pattern');
    }
  } catch (err) {
    logger.warn({ err: err.message, pattern }, 'Redis delByPattern error');
  }
}

async function connect() {
  const c = getClient();
  if (c) await c.connect().catch(() => null);
  return c;
}

module.exports = { connect, get, set, del, delByPattern };
