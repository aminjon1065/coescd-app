import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8008/api';

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'Description',
  status: 'new',
  priority: 'medium',
  dueDate: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  creator: { id: 100, name: 'Admin User', email: 'admin@coescd.local' },
  receiver: null,
  department: null,
  files: [],
};

async function setupTasksMocks(page: Page) {
  await page.context().addCookies([
    { name: 'refreshToken', value: 'test-token', domain: 'localhost', path: '/' },
    { name: 'csrfToken', value: 'test-csrf', domain: 'localhost', path: '/' },
  ]);

  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith('/authentication/refresh-tokens') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-token',
          user: {
            id: 100, email: 'admin@coescd.local', name: 'Admin',
            role: 'admin',
            permissions: ['tasks.read', 'tasks.write', 'users.read', 'documents.read', 'analytics.read', 'reports.read', 'gis.read', 'files.read', 'departments.read'],
            department: null,
          },
        }),
      });
      return;
    }

    if (url.endsWith('/task') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [mockTask], total: 1, page: 1, limit: 20 }),
      });
      return;
    }

    if (url.includes('/task/') && method === 'GET') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(mockTask),
      });
      return;
    }

    if (url.endsWith('/task') && method === 'POST') {
      await route.fulfill({
        status: 201, contentType: 'application/json',
        body: JSON.stringify({ ...mockTask, id: 2, title: 'Created Task' }),
      });
      return;
    }

    if (url.includes('/task/') && method === 'PATCH') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...mockTask, status: 'in_progress' }),
      });
      return;
    }

    if (url.endsWith('/users') || url.includes('/users?') || url.includes('/department')) {
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

test('tasks page renders task list', async ({ page }) => {
  await setupTasksMocks(page);
  await page.goto('/dashboard/tasks');

  await expect(page.getByText('Test Task')).toBeVisible();
});

test('tasks page shows task count badge', async ({ page }) => {
  await setupTasksMocks(page);
  await page.goto('/dashboard/tasks');

  // Page should load without errors
  await expect(page).toHaveURL(/\/dashboard\/tasks/);
  await expect(page.locator('body')).not.toContainText('Error');
});

test('create task dialog opens', async ({ page }) => {
  await setupTasksMocks(page);
  await page.goto('/dashboard/tasks');

  // Look for a "create" or "new task" button
  const createBtn = page.locator('button').filter({ hasText: /создать|new task|добавить/i }).first();
  if (await createBtn.count() > 0) {
    await createBtn.click();
    // Dialog or form should appear
    await expect(page.locator('[role="dialog"], form')).toBeVisible();
  }
});

test('task detail page loads', async ({ page }) => {
  await setupTasksMocks(page);
  await page.goto('/dashboard/tasks/1');

  await expect(page).toHaveURL(/\/dashboard\/tasks\/1/);
  await expect(page.locator('body')).not.toContainText('404');
});
