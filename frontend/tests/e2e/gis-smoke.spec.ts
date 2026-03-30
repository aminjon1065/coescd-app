import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8008/api';

const mockLayer = {
  id: 1,
  name: 'Evacuation Routes',
  type: 'route',
  description: 'Main evacuation routes',
  isActive: true,
  department: null,
  createdAt: new Date().toISOString(),
};

const mockFeature = {
  id: 1,
  name: 'Point A',
  geometry: { type: 'Point', coordinates: [76.9, 43.2] },
  properties: {},
  layer: mockLayer,
  createdAt: new Date().toISOString(),
};

async function setupGisMocks(page: Page) {
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
            permissions: ['gis.read', 'gis.write', 'analytics.read', 'tasks.read', 'documents.read', 'files.read', 'reports.read'],
            department: null,
          },
        }),
      });
      return;
    }

    if (url.includes('/gis/layers') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([mockLayer]),
      });
      return;
    }

    if (url.includes('/gis/layers') && method === 'POST') {
      await route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ ...mockLayer, id: 2, name: 'New Layer' }),
      });
      return;
    }

    if (url.includes('/gis/features') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [mockFeature], total: 1, page: 1, limit: 100 }),
      });
      return;
    }

    if (url.includes('/gis/features') && method === 'POST') {
      await route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ ...mockFeature, id: 2 }),
      });
      return;
    }

    if (url.includes('/disasters')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
      return;
    }

    if (url.endsWith('/notifications/unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test('GIS page loads without errors', async ({ page }) => {
  await setupGisMocks(page);
  await page.goto('/dashboard/gis');

  await expect(page).toHaveURL(/\/dashboard\/gis/);
  await expect(page.locator('body')).not.toContainText('Something went wrong');
  await expect(page.locator('body')).not.toContainText('Доступ ограничен');
});

test('GIS page shows layer list', async ({ page }) => {
  await setupGisMocks(page);
  await page.goto('/dashboard/gis');

  await expect(page.getByText('Evacuation Routes')).toBeVisible();
});

test('GIS page has map container', async ({ page }) => {
  await setupGisMocks(page);
  await page.goto('/dashboard/gis');

  // Map container div should exist
  const mapEl = page.locator('[class*="leaflet"], [id*="map"], [class*="map"]').first();
  await expect(mapEl).toBeVisible({ timeout: 10000 });
});
