/**
 * projects.test.js — Integration tests for projects endpoints (R19)
 */
const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../../src/database/db');

const STRONG_PASSWORD = 'TaskFlow2026!';

let cookieA; // cookie for org A user
let cookieB; // cookie for org B user

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
  await db.destroy();
});

beforeEach(async () => {
  await db('tasks').del();
  await db('projects').del();
  await db('users').del();
  await db('organizations').del();

  // Register two separate organizations
  const resA = await request(app)
    .post('/api/v1/auth/signup')
    .send({ orgName: 'Org Alpha', name: 'User A', email: 'a@orga.com', password: STRONG_PASSWORD });

  const resB = await request(app)
    .post('/api/v1/auth/signup')
    .send({ orgName: 'Org Beta', name: 'User B', email: 'b@orgb.com', password: STRONG_PASSWORD });

  // Join cookies array into a single string for supertest
  const rawA = resA.headers['set-cookie'];
  const rawB = resB.headers['set-cookie'];
  cookieA = Array.isArray(rawA) ? rawA.join('; ') : rawA;
  cookieB = Array.isArray(rawB) ? rawB.join('; ') : rawB;
});

describe('GET /api/v1/projects', () => {
  it('200 — returns own projects', async () => {
    const res = await request(app).get('/api/v1/projects').set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/projects', () => {
  it('201 — creates project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', cookieA)
      .send({ name: 'Project Alpha' });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('Project Alpha');
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('403 — cross-org access denied', async () => {
    // Create project in org A
    const created = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', cookieA)
      .send({ name: 'Private Project' });

    // Org B tries to access it — must get 403
    const res = await request(app)
      .get(`/api/v1/projects/${created.body.project.id}`)
      .set('Cookie', cookieB);

    expect(res.status).toBe(403);
  });
});
