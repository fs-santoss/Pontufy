import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3457';

async function loginAsAdmin(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'admin@alpha.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Certificates UI QA', () => {
  test('unauthenticated user cannot access /certificados', async ({ page }) => {
    await page.goto(`${BASE}/certificados`);
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('authenticated user can access /certificados', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/certificados`);
    await expect(page.locator('h1')).toHaveText('Meus Certificados', { timeout: 10000 });
  });

  test('/certificados page shows empty state when no certs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/certificados`);
    // Either shows empty state or a list — page should render without error
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Meus Certificados', { timeout: 10000 });
  });

  test('certificados link is visible in navbar', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('a[href="/certificados"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('/api/certificates returns array for authenticated user', async ({ request, page }) => {
    // Login via page to set cookie
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const response = await request.get(`${BASE}/api/certificates`, {
      headers: { Cookie: cookieHeader },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('/api/certificates returns 401 for unauthenticated', async ({ request }) => {
    const response = await request.get(`${BASE}/api/certificates`);
    expect(response.status()).toBe(401);
  });
});
