import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8008/api';

const mockDocument = {
  id: 1,
  title: 'Test EDM Document',
  subject: 'Test Subject',
  status: 'draft',
  type: 'incoming',
  confidentiality: 'public',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  creator: { id: 100, name: 'Admin', email: 'admin@coescd.local' },
  department: null,
  externalNumber: null,
  dueAt: null,
  files: [],
  route: null,
};

async function setupEdmMocks(page: Page) {
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
            id: 100, email: 'admin@coescd.local', name: 'Admin',
            role: 'admin',
            permissions: [
              'documents.read', 'documents.write', 'tasks.read', 'analytics.read',
              'reports.read', 'gis.read', 'files.read', 'users.read', 'departments.read',
            ],
            department: null,
          },
        }),
      });
      return;
    }

    if ((url.endsWith('/edm/documents') || url.includes('/edm/documents?')) && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [mockDocument], total: 1, page: 1, limit: 20 }),
      });
      return;
    }

    if (url.includes('/edm/documents/') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(mockDocument),
      });
      return;
    }

    if (url.endsWith('/edm/documents') && method === 'POST') {
      await route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ ...mockDocument, id: 2, title: 'New Document' }),
      });
      return;
    }

    if (url.includes('/edm/kinds') || url.includes('/edm/templates')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/edm/documents/') && url.includes('/route') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/edm/documents/') && url.includes('/audit')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/edm/documents/') && url.includes('/history')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.endsWith('/notifications/unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
      return;
    }

    if (url.includes('/department') || url.includes('/users')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test('EDM documents list renders', async ({ page }) => {
  await setupEdmMocks(page);
  await page.goto('/dashboard/documentation');

  await expect(page).toHaveURL(/\/dashboard\/documentation/);
  await expect(page.getByText('Test EDM Document')).toBeVisible();
});

test('EDM document detail page loads', async ({ page }) => {
  await setupEdmMocks(page);
  await page.goto('/dashboard/documentation/1');

  await expect(page).toHaveURL(/\/dashboard\/documentation\/1/);
  await expect(page.locator('body')).not.toContainText('404');
});

test('EDM approvals page is accessible', async ({ page }) => {
  await setupEdmMocks(page);
  await page.goto('/dashboard/documentation/approvals');

  await expect(page).toHaveURL(/\/dashboard\/documentation\/approvals/);
  await expect(page.locator('body')).not.toContainText('Доступ ограничен');
});

test('EDM registry page renders', async ({ page }) => {
  await setupEdmMocks(page);
  await page.goto('/dashboard/documentation/registry');

  await expect(page).toHaveURL(/\/dashboard\/documentation\/registry/);
});
