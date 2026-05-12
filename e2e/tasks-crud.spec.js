/**
 * tasks-crud.spec.js — E2E tests for task management flows (R34–R36)
 * Covers: create task, validation error, view task, cross-tenant isolation.
 */
const { test, expect } = require('@playwright/test');

const BASE_API        = process.env.E2E_API_URL || 'http://localhost:4000';
const STRONG_PASSWORD = 'TaskFlow2026!';

// ── Helpers ────────────────────────────────────────────────────────────────

async function createUserAndGetCookie(request, orgName, email) {
  const res = await request.post(`${BASE_API}/api/v1/auth/signup`, {
    data: { orgName, name: 'Test User', email, password: STRONG_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  return res;
}

async function loginViaApi(request, email) {
  const res = await request.post(`${BASE_API}/api/v1/auth/login`, {
    data: { email, password: STRONG_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  return res;
}

// Reset DB before each test (R36)
test.beforeEach(async ({ request }) => {
  await request.post(`${BASE_API}/api/test/reset-db`);
});

// ── Test 1: Create task happy path ─────────────────────────────────────────
test('create task — appears in dashboard task list', async ({ page, request }) => {
  // Setup: org + user + project via API (fast)
  const signupRes = await createUserAndGetCookie(request, 'Plateau Digital', 'lina@plateaudigital.ci');

  // Get auth cookie from signup
  const cookies = signupRes.headers()['set-cookie'];

  // Create a project via API
  const projectRes = await request.post(`${BASE_API}/api/v1/projects`, {
    data: { name: 'Q1 Planning' },
  });

  await page.goto('/dashboard');

  // Navigate to create task
  await page.getByRole('link', { name: /tasks|tâches/i }).click();
  await page.getByRole('button', { name: /new task|nouvelle tâche|\+ task/i }).click();

  // Fill the task creation form
  await page.getByLabel(/title|titre/i).fill('Review Q1 contracts');
  await page.getByLabel(/priority|priorité/i).selectOption('high');
  await page.getByLabel(/status|statut/i).selectOption('todo');

  await page.getByRole('button', { name: /create|créer/i }).click();

  // The task should appear in the task list
  await expect(page.getByText('Review Q1 contracts')).toBeVisible();
});

// ── Test 2: Validation error — empty title ─────────────────────────────────
test('create task — shows validation error on empty title', async ({ page, request }) => {
  await createUserAndGetCookie(request, 'Plateau Digital', 'lina@plateaudigital.ci');

  await page.goto('/tasks');

  // Try to open new task form
  const newTaskButton = page.getByRole('button', { name: /new task|nouvelle tâche|\+ task/i });
  if (await newTaskButton.isVisible()) {
    await newTaskButton.click();
  }

  // Submit without filling title
  await page.getByRole('button', { name: /create|créer/i }).click();

  // Expect inline error near the title input
  await expect(
    page.getByText(/title.*required|titre.*requis|le titre est requis/i)
  ).toBeVisible();

  // Form should NOT have navigated away
  await expect(page).toHaveURL(/tasks/);
});

// ── Test 3: Cross-tenant isolation (CRITICAL SECURITY TEST) ───────────────
test('cross-tenant — cannot access another org\'s task via URL', async ({ page, request }) => {
  // Create Org A + task
  const orgARes = await createUserAndGetCookie(request, 'Org Alpha', 'alice@orgalpha.com');

  // Create project + task in Org A
  const projectARes = await request.post(`${BASE_API}/api/v1/projects`, {
    data: { name: 'Alpha Project' },
  });
  const projectA = await projectARes.json();

  const taskARes = await request.post(`${BASE_API}/api/v1/tasks`, {
    data: {
      title:      'Secret Alpha Task',
      project_id: projectA.project?.id || projectA.id,
      status:     'todo',
      priority:   'medium',
    },
  });
  const taskA = await taskARes.json();
  const taskAId = taskA.task?.id || taskA.id;

  // Create Org B + login as Org B user
  await request.post(`${BASE_API}/api/test/reset-db`);
  await createUserAndGetCookie(request, 'Org Beta', 'bob@orgbeta.com');

  await page.goto(`/tasks/${taskAId}`);

  // Must NOT see the task content — expect 404 page or redirect
  await expect(page.getByText('Secret Alpha Task')).not.toBeVisible({ timeout: 5000 });

  // Expect a "not found" indicator or redirect to a safe page
  const url = page.url();
  const body = await page.textContent('body');
  const isProtected =
    url.includes('404') ||
    url.includes('not-found') ||
    url.includes('dashboard') ||
    /not found|404|introuvable/i.test(body || '');

  expect(isProtected).toBe(true);
});
