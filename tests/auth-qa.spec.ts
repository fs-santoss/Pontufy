import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3457';

test.describe('Auth System QA', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('h1')).toHaveText('Entrar');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Entrar');
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email ou senha incorretos')).toBeVisible({ timeout: 10000 });
  });

  test('login with valid seed credentials redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@alpha.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('authenticated user is redirected away from login page', async ({ page }) => {
    // First login
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@alpha.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Try to go back to login
    await page.goto(`${BASE}/login`);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('logout redirects to login page', async ({ page }) => {
    // Login first
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@alpha.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Click user avatar to open dropdown (desktop)
    const avatar = page.locator('button:has-text("A")').first();
    if (await avatar.isVisible()) {
      await avatar.click();
      await page.click('text=Sair da conta');
    } else {
      // Mobile menu
      await page.click('[data-testid="mobile-menu"]');
      await page.click('text=Sair da conta');
    }

    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user cannot access dashboard', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user cannot access admin panel', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('employee cannot access admin panel', async ({ page }) => {
    // Login as employee
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'user@alpha.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Try to access admin
    await page.goto(`${BASE}/admin`);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('register page without token shows invite required', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.locator('text=Convite necessário')).toBeVisible();
  });

  test('register page with invalid token shows form', async ({ page }) => {
    await page.goto(`${BASE}/register?token=invalid-token`);
    await expect(page.locator('input[placeholder="Ex: Maria Silva"]')).toBeVisible();
  });

  test('register with short password shows error', async ({ page }) => {
    await page.goto(`${BASE}/register?token=test-token`);
    await page.fill('input[placeholder="Ex: Maria Silva"]', 'Test User');
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill('1234');
    await passwordInputs.last().fill('1234');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=pelo menos 8 caracteres')).toBeVisible({ timeout: 5000 });
  });

  test('register with mismatched passwords shows error', async ({ page }) => {
    await page.goto(`${BASE}/register?token=test-token`);
    await page.fill('input[placeholder="Ex: Maria Silva"]', 'Test User');
    await page.fill('input[placeholder="Mínimo 8 caracteres"]', 'password123');
    // Fill confirm password field differently
    const confirmInput = page.locator('input[type="password"]').last();
    await confirmInput.fill('different123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=senhas não coincidem')).toBeVisible({ timeout: 5000 });
  });

  test('forgot password page renders correctly', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`);
    await expect(page.locator('h1')).toHaveText('Recuperar senha');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Enviar link');
  });

  test('reset password page without token shows error', async ({ page }) => {
    await page.goto(`${BASE}/reset-password`);
    await expect(page.locator('text=Link inválido')).toBeVisible();
  });

  test('superadmin route returns 403 for unauthenticated', async ({ request }) => {
    const response = await request.get(`${BASE}/superadmin`);
    expect(response.status()).toBe(403);
  });

  test('password toggle works on login page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the toggle button
    await page.click('button:has(svg)');
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('session cookie is set after login', async ({ page, context }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', 'admin@alpha.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session-token'));
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.httpOnly).toBe(true);
  });
});
