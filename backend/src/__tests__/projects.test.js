const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database/db');

let agentA; // cookie for org A user
let agentB; // cookie for org B user

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
    .post('/api/v1/auth/register')
    .send({ orgName: 'Org A', name: 'User A', email: 'a@orga.com', password: 'secret123' });
  agentA = resA.headers['set-cookie'];

  const resB = await request(app)
    .post('/api/v1/auth/register')
    .send({ orgName: 'Org B', name: 'User B', email: 'b@orgb.com', password: 'secret123' });
  agentB = resB.headers['set-cookie'];
});

describe('GET /api/v1/projects', () => {
  it('200 - returns own projects', async () => {
    const res = await request(app).get('/api/v1/projects').set('Cookie', agentA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  it('401 - unauthenticated', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/projects', () => {
  it('201 - creates project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', agentA)
      .send({ name: 'Project Alpha' });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('Project Alpha');
  });

  it('401 - unauthenticated', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('403 - cross-org access denied', async () => {
    // Create project in org A
    const created = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', agentA)
      .send({ name: 'Private' });

    // Org B tries to access it
    const res = await request(app)
      .get(`/api/v1/projects/${created.body.project.id}`)
      .set('Cookie', agentB);

    expect(res.status).toBe(403);
  });
});
