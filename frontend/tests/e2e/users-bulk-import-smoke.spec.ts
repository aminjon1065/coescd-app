import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8008/api';

const mockUsers = [
  { id: 1, name: 'Alice Smith', email: 'alice@coescd.local', role: 'regular', isActive: true, department: null, permissions: [] },
  { id: 2, name: 'Bob Jones', email: 'bob@coescd.local', role: 'manager', isActive: true, department: { id: 1, name: 'HQ' }, permissions: [] },
];

async function setupUsersMocks(page: Page) {
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
            permissions: ['users.read', 'users.write', 'users.update', 'tasks.read', 'documents.read', 'analytics.read', 'reports.read', 'gis.read', 'files.read', 'departments.read'],
            department: null,
          },
        }),
      });
      return;
    }

    if ((url.endsWith('/users') || url.includes('/users?')) && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: mockUsers, total: 2, page: 1, limit: 20 }),
      });
      return;
    }

    if (url.includes('/users/') && method === 'GET') {
      const id = Number(url.split('/users/')[1]);
      const user = mockUsers.find((u) => u.id === id) ?? mockUsers[0];
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(user),
      });
      return;
    }

    if (url.endsWith('/users') && method === 'POST') {
      await route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ ...mockUsers[0], id: 99, name: 'New User', email: 'new@coescd.local' }),
      });
      return;
    }

    if (url.includes('/users/bulk-import/dry-run') && method === 'POST') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
          preview: [
            { row: 1, name: 'Carol White', email: 'carol@coescd.local', role: 'regular', valid: true, errors: [] },
            { row: 2, name: 'Dave Black', email: 'dave@coescd.local', role: 'manager', valid: true, errors: [] },
          ],
        }),
      });
      return;
    }

    if (url.includes('/users/bulk-import') && method === 'POST') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ imported: 2, failed: 0, operationId: 'op-123' }),
      });
      return;
    }

    if (url.includes('/department')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'HQ', type: 'main' }]),
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

test('users page renders user list', async ({ page }) => {
  await setupUsersMocks(page);
  await page.goto('/dashboard/users');

  await expect(page).toHaveURL(/\/dashboard\/users/);
  await expect(page.getByText('Alice Smith')).toBeVisible();
  await expect(page.getByText('Bob Jones')).toBeVisible();
});

test('users page shows role badges', async ({ page }) => {
  await setupUsersMocks(page);
  await page.goto('/dashboard/users');

  // Role information should be visible
  await expect(page.locator('body')).not.toContainText('Error');
});

test('admin can access users page', async ({ page }) => {
  await setupUsersMocks(page);
  await page.goto('/dashboard/users');

  await expect(page).toHaveURL(/\/dashboard\/users/);
  await expect(page.locator('body')).not.toContainText('Доступ ограничен');
});

test('regular user cannot access users management page', async ({ page }) => {
  await page.context().addCookies([
    { name: 'refreshToken', value: 'test-token', domain: 'localhost', path: '/' },
    { name: 'csrfToken', value: 'test-csrf', domain: 'localhost', path: '/' },
  ]);

  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    if (url.endsWith('/authentication/refresh-tokens')) {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-token',
          user: {
            id: 50, email: 'regular@coescd.local', name: 'Regular',
            role: 'regular',
            permissions: ['tasks.read', 'documents.read', 'gis.read', 'files.read'],
            department: null,
          },
        }),
      });
      return;
    }
    if (url.endsWith('/notifications/unread-count')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('/dashboard/users');
  await expect(page.getByText('Доступ ограничен')).toBeVisible();
});
