/**
 * auth.spec.js — E2E tests for authentication flows (R34–R36)
 * Covers: signup, login, logout user journeys via real browser.
 */
const { test, expect } = require('@playwright/test');

const BASE_API = process.env.E2E_API_URL || 'http://localhost:4000';
const STRONG_PASSWORD = 'TaskFlow2026!';

// Reset DB before each test to ensure isolation (R36)
test.beforeEach(async ({ request }) => {
  await request.post(`${BASE_API}/api/test/reset-db`);
});

// ── Test 1: Signup happy path ──────────────────────────────────────────────
test('signup — creates account and lands on dashboard', async ({ page }) => {
  await page.goto('/register');

  // Fill form using accessible selectors (getByLabel, getByRole)
  await page.getByLabel(/organization/i).fill('Plateau Digital');
  await page.getByLabel(/name/i).first().fill('Lina');
  await page.getByLabel(/email/i).fill('lina@plateaudigital.ci');
  await page.getByLabel(/password/i).fill(STRONG_PASSWORD);

  await page.getByRole('button', { name: /register|sign up|créer|inscription/i }).click();

  // Expect redirect to dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Expect a greeting with the user's name
  await expect(page.getByText(/lina/i)).toBeVisible();
});

// ── Test 2: Login happy path ───────────────────────────────────────────────
test('login — authenticates user and lands on dashboard', async ({ page, request }) => {
  // Pre-create user via API (faster than UI flow for setup)
  await request.post(`${BASE_API}/api/v1/auth/signup`, {
    data: {
      orgName:  'Plateau Digital',
      name:     'Lina',
      email:    'lina@plateaudigital.ci',
      password: STRONG_PASSWORD,
    },
  });

  await page.goto('/login');

  await page.getByLabel(/email/i).fill('lina@plateaudigital.ci');
  await page.getByLabel(/password/i).fill(STRONG_PASSWORD);

  await page.getByRole('button', { name: /login|connexion|se connecter/i }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText(/lina/i)).toBeVisible();
});

// ── Test 3: Logout ─────────────────────────────────────────────────────────
test('logout — clears session and protects /dashboard', async ({ page, request }) => {
  // Pre-login via API
  const signupRes = await request.post(`${BASE_API}/api/v1/auth/signup`, {
    data: {
      orgName:  'Plateau Digital',
      name:     'Lina',
      email:    'lina@plateaudigital.ci',
      password: STRONG_PASSWORD,
    },
  });
  expect(signupRes.ok()).toBeTruthy();

  // Navigate to dashboard as authenticated user
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);

  // Click logout
  await page.getByRole('button', { name: /logout|déconnexion|sign out/i }).click();

  // Should redirect away from dashboard
  await expect(page).not.toHaveURL(/dashboard/);

  // Try to access dashboard again — should redirect to login
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login|signin|\//);
});
