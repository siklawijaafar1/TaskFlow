const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database/db');

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

describe('POST /api/v1/auth/register', () => {
  it('201 - creates org and user, sets cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ orgName: 'Acme', name: 'Alice', email: 'alice@acme.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'alice@acme.com', name: 'Alice' });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('422 - missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ orgName: 'Acme', name: 'Alice', email: 'alice@acme.com', password: 'secret123' });
  });

  it('200 - valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ organizationSlug: 'acme', email: 'alice@acme.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@acme.com');
  });

  it('401 - no cookie, protected route', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('422 - wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ organizationSlug: 'acme', email: 'alice@acme.com', password: 'wrong' });

    expect(res.status).toBe(422);
  });
});
