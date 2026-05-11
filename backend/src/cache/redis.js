const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

client.on('error', (err) => console.error('Redis error:', err));

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

async function get(key) {
  const c = await connect();
  const val = await c.get(key);
  return val ? JSON.parse(val) : null;
}

async function set(key, value, ttlSeconds = 3600) {
  const c = await connect();
  await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

async function del(key) {
  const c = await connect();
  await c.del(key);
}

module.exports = { connect, get, set, del };
