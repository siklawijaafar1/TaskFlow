/**
 * auth.test.js — Integration tests for auth endpoints (R19)
 * Tests: 201/200 success, 401 wrong creds, 409 duplicate, 422 validation
 */
const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../../src/database/db');

// Valid password that satisfies Joi schema (min 12, uppercase, number, special)
const STRONG_PASSWORD = 'TaskFlow2026!';

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
  await db.destroy();
});

afterEach(async () => {
  await db('tasks').del();
  await db('projects').del();
  await db('users').del();
  await db('organizations').del();
});

// ── POST /api/v1/auth/signup ───────────────────────────────────────────────

describe('POST /api/v1/auth/signup', () => {
  it('201 — creates org and user, sets taskflow_session cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: STRONG_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'alice@acme.com', name: 'Alice' });
    expect(res.body.user.password_hash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('taskflow_session='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('409 — duplicate email in same org slug', async () => {
    const payload = { orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: STRONG_PASSWORD };
    await request(app).post('/api/v1/auth/signup').send(payload);
    const res = await request(app).post('/api/v1/auth/signup').send(payload);
    expect(res.status).toBe(409);
  });

  it('422 — weak password (too short, no uppercase/special)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('422 — missing fields (empty body)', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

// ── POST /api/v1/auth/register (backward-compat alias) ────────────────────

describe('POST /api/v1/auth/register', () => {
  it('201 — creates org and user (alias for /signup)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ orgName: 'Beta Corp', name: 'Bob', email: 'bob@beta.com', password: STRONG_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('bob@beta.com');
  });

  it('422 — missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(422);
  });
});

// ── POST /api/v1/auth/login ────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: STRONG_PASSWORD });
  });

  it('200 — valid credentials, sets taskflow_session cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@acme.com', password: STRONG_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@acme.com');
    expect(res.headers['set-cookie'].some((c) => c.startsWith('taskflow_session='))).toBe(true);
  });

  it('401 — wrong password (generic message, does not reveal which field)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@acme.com', password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    // Must NOT reveal which field is wrong (security: R27)
    expect(res.body.error).not.toMatch(/^email/i);
    expect(res.body.error).not.toMatch(/^password/i);
  });

  it('401 — unknown email (same generic message)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@nowhere.com', password: STRONG_PASSWORD });

    expect(res.status).toBe(401);
  });

  it('422 — missing email field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: STRONG_PASSWORD });

    expect(res.status).toBe(422);
  });
});

// ── POST /api/v1/auth/logout ───────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('200 — requires auth, clears taskflow_session cookie', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: STRONG_PASSWORD });

    // supertest needs the set-cookie header joined as a single string
    const cookies = signupRes.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieStr);

    expect(res.status).toBe(200);
  });

  it('401 — logout without cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('401 — no cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('200 — valid cookie returns user payload without password_hash', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgName: 'Acme Corp', name: 'Alice', email: 'alice@acme.com', password: STRONG_PASSWORD });

    const cookies = signupRes.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieStr);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'alice@acme.com', name: 'Alice' });
    expect(res.body.user.password_hash).toBeUndefined();
  });
});
