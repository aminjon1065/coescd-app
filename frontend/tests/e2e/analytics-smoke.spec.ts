import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8008/api';

async function setupAnalyticsMocks(page: Page) {
  await page.context().addCookies([
    { name: 'refreshToken', value: 'test-token', domain: 'localhost', path: '/' },
    { name: 'csrfToken', value: 'test-csrf', domain: 'localhost', path: '/' },
  ]);

  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith('/authentication/refresh-tokens') && method === 'POST') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-token',
          user: {
            id: 100, email: 'analyst@coescd.local', name: 'Analyst',
            role: 'regular',
            permissions: ['analytics.read', 'analytics.write', 'reports.read', 'tasks.read', 'documents.read', 'gis.read', 'files.read'],
            department: null,
          },
        }),
      });
      return;
    }

    if (url.endsWith('/reports/stats')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          totalDisasters: 42, activeDisasters: 8,
          totalUsers: 150, totalDepartments: 10,
          totalTasks: 200, activeTasks: 45,
        }),
      });
      return;
    }

    if (url.endsWith('/disasters') || url.includes('/disasters?')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1, title: 'Earthquake Almaty', location: 'Almaty',
              severity: 'high', status: 'active',
              latitude: 43.25, longitude: 76.95,
              casualties: 0, affectedPeople: 500,
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              type: { id: 1, name: 'Earthquake' }, department: null,
            },
          ],
          total: 1, page: 1, limit: 20,
        }),
      });
      return;
    }

    if (url.endsWith('/task') || url.includes('/task?')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
      return;
    }

    if (url.endsWith('/department') || url.includes('/department?')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'HQ', type: 'main' }]),
      });
      return;
    }

    if (url.includes('/reports/incidents-trend')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { date: '2026-01-01', count: 3 },
          { date: '2026-01-02', count: 5 },
        ]),
      });
      return;
    }

    if (url.includes('/reports/tasks-by-department')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/edm/reports/dashboard')) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) });
      return;
    }

    if (url.endsWith('/notifications/unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 2 }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test('analytics page renders KPI cards', async ({ page }) => {
  await setupAnalyticsMocks(page);
  await page.goto('/dashboard/analytic');

  await expect(page).toHaveURL(/\/dashboard\/analytic/);
  // KPI card for total disasters should show the mocked value
  await expect(page.getByText('42')).toBeVisible();
});

test('analytics page renders disaster list', async ({ page }) => {
  await setupAnalyticsMocks(page);
  await page.goto('/dashboard/analytic');

  await expect(page.getByText('Earthquake Almaty')).toBeVisible();
});

test('analytics page has prediction section', async ({ page }) => {
  await setupAnalyticsMocks(page);
  await page.goto('/dashboard/analytic');

  await expect(page.getByText(/прогнозирование/i)).toBeVisible();
});

test('analytics page filter controls are visible', async ({ page }) => {
  await setupAnalyticsMocks(page);
  await page.goto('/dashboard/analytic');

  await expect(page.getByPlaceholder(/поиск/i)).toBeVisible();
});

test('notification bell shows unread badge', async ({ page }) => {
  await setupAnalyticsMocks(page);
  await page.goto('/dashboard/analytic');

  // Bell badge should show "2" from the mocked unread count
  await expect(page.locator('text=2').first()).toBeVisible();
});
