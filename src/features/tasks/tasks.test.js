/**
 * Tests d'intégration — POST /api/v1/tasks · GET /api/v1/tasks/:id
 *
 * Méthodologie TDD : ce fichier est écrit EN PREMIER, avant toute implémentation.
 *
 * Auth "mockée" : on génère directement des JWT valides via makeAuthCookie()
 * au lieu de passer par le flow register → login. Le middleware réel vérifie
 * quand même la signature — ce n'est pas un stub, c'est un raccourci de test.
 *
 * Couverture minimale CLAUDE.md R19 :
 *   POST  : 201 · 401 · 403 · 422
 *   GET   : 200 · 401 · 403
 *   Isolation multi-tenant (R13) : l'utilisateur de l'org B ne voit pas
 *   les tâches de l'org A — doit retourner 403, jamais 404 (R19).
 */

// ── Env setup (avant tout require) ───────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_tasks_suite';
process.env.COOKIE_SECRET = 'test_cookie_secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');

const app = require('../../../backend/src/app');
const db  = require('../../../backend/src/database/db');

// ── Helper : génère un cookie JWT signé sans passer par l'API auth ────────────
function makeAuthCookie(userId, orgId, role = 'member') {
  const token = jwt.sign(
    { sub: userId, organizationId: orgId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `taskflow_session=${token}`;
}

// ── UUIDs fixes pour données de test déterministes ───────────────────────────
const ID = {
  orgA:  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  orgB:  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  userA: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
  userB: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc',
  projA: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
  projB: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd',
};

// Cookies pré-générés (JWT signé avec le bon secret)
const cookieA = makeAuthCookie(ID.userA, ID.orgA, 'owner');
const cookieB = makeAuthCookie(ID.userB, ID.orgB, 'owner');

// ── Cycle de vie de la base de test ──────────────────────────────────────────
beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(null, true);
  await db.destroy();
});

// Réinitialise + reseed avant chaque test pour garantir l'isolation
beforeEach(async () => {
  await db('tasks').del();
  await db('projects').del();
  await db('users').del();
  await db('organizations').del();

  await db('organizations').insert([
    { id: ID.orgA, name: 'Org Alpha', slug: 'org-alpha' },
    { id: ID.orgB, name: 'Org Beta',  slug: 'org-beta'  },
  ]);

  await db('users').insert([
    {
      id:              ID.userA,
      organization_id: ID.orgA,
      email:           'alice@alpha.io',
      password_hash:   '$2b$12$testhashAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      name:            'Alice Alpha',
      role:            'owner',
    },
    {
      id:              ID.userB,
      organization_id: ID.orgB,
      email:           'bob@beta.io',
      password_hash:   '$2b$12$testhashBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      name:            'Bob Beta',
      role:            'owner',
    },
  ]);

  await db('projects').insert([
    {
      id:              ID.projA,
      organization_id: ID.orgA,
      created_by:      ID.userA,
      name:            'Project Alpha',
      status:          'active',
    },
    {
      id:              ID.projB,
      organization_id: ID.orgB,
      created_by:      ID.userB,
      name:            'Project Beta',
      status:          'active',
    },
  ]);
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/v1/tasks
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/tasks', () => {

  it('201 — crée une tâche et retourne le document complet', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({
        project_id:  ID.projA,
        title:       'Implémenter l\'authentification OAuth',
        description: 'Google SSO via passport.js',
        priority:    'high',
        status:      'todo',
      });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      title:           'Implémenter l\'authentification OAuth',
      project_id:      ID.projA,
      organization_id: ID.orgA,
      created_by:      ID.userA,
      status:          'todo',
      priority:        'high',
    });
    expect(res.body.task.id).toBeDefined();
    expect(res.body.task.password_hash).toBeUndefined(); // pas de fuite de champ sensible
  });

  it('201 — les champs optionnels ont des valeurs par défaut sensées', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ project_id: ID.projA, title: 'Tâche minimale' });

    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe('todo');
    expect(res.body.task.priority).toBe('medium');
    expect(res.body.task.assigned_to).toBeNull();
  });

  // ── Cas 401 ────────────────────────────────────────────────────────────────
  it('401 — rejette une requête sans cookie d\'authentification', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ project_id: ID.projA, title: 'Ghost task' });

    expect(res.status).toBe(401);
  });

  // ── Cas 422 ────────────────────────────────────────────────────────────────
  it('422 — rejette si title est absent', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ project_id: ID.projA });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/title/i);
  });

  it('422 — rejette si title est une chaîne vide', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ project_id: ID.projA, title: '   ' });

    expect(res.status).toBe(422);
  });

  it('422 — rejette si project_id est absent', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ title: 'Tâche sans projet' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/project_id/i);
  });

  it('422 — rejette une valeur de status invalide', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ project_id: ID.projA, title: 'Bad status', status: 'wip_invalid' });

    expect(res.status).toBe(422);
  });

  it('422 — rejette une valeur de priority invalide', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({ project_id: ID.projA, title: 'Bad priority', priority: 'critical_invalid' });

    expect(res.status).toBe(422);
  });

  // ── Cas 403 · isolation multi-tenant ────────────────────────────────────────
  it('403 — isolation multi-tenant : org B ne peut pas créer une tâche dans le projet de org A', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieB)       // authentifié comme org B
      .send({ project_id: ID.projA, title: 'Tentative cross-org' }); // projet org A

    expect(res.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/v1/tasks/:id
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/tasks/:id', () => {
  let taskA; // tâche créée pour org A, récupérée avant chaque test

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Cookie', cookieA)
      .send({
        project_id: ID.projA,
        title:      'Tâche secrète Alpha',
        priority:   'urgent',
      });
    taskA = res.body.task;
  });

  it('200 — retourne la tâche à son organisation propriétaire', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskA.id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({
      id:              taskA.id,
      title:           'Tâche secrète Alpha',
      organization_id: ID.orgA,
      project_id:      ID.projA,
    });
  });

  // ── Cas 401 ────────────────────────────────────────────────────────────────
  it('401 — rejette une requête sans cookie', async () => {
    const res = await request(app).get(`/api/v1/tasks/${taskA.id}`);
    expect(res.status).toBe(401);
  });

  // ── Cas 403 · isolation multi-tenant ────────────────────────────────────────
  it('403 — isolation multi-tenant : org B ne peut pas lire la tâche de org A', async () => {
    // Règle CLAUDE.md R19 : retourner 403, JAMAIS 404 pour l'accès inter-organisation
    const res = await request(app)
      .get(`/api/v1/tasks/${taskA.id}`)
      .set('Cookie', cookieB); // authentifié comme org B

    expect(res.status).toBe(403);
    // Vérifie aussi que la réponse ne fuite pas d'infos sur la tâche
    expect(res.body.task).toBeUndefined();
  });

  it('403 — retourne 403 (pas 404) pour un id inexistant (R19)', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .get(`/api/v1/tasks/${fakeId}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(403);
  });

  it('403 — un utilisateur supprimé (soft-delete) ne voit plus sa tâche', async () => {
    // Soft-delete de la tâche (R12) : la tâche ne doit plus être accessible
    await db('tasks').where({ id: taskA.id }).update({ deleted_at: new Date() });

    const res = await request(app)
      .get(`/api/v1/tasks/${taskA.id}`)
      .set('Cookie', cookieA);

    expect(res.status).toBe(403);
  });
});
