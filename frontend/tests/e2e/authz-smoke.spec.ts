import { expect, test, type Page } from '@playwright/test';

type TestRole = 'admin' | 'manager' | 'regular';

const API_BASE = 'http://localhost:8008/api';

const adminPermissions = [
  'users.read',
  'users.update',
  'departments.read',
  'documents.read',
  'tasks.read',
  'analytics.read',
  'reports.read',
  'gis.read',
  'files.read',
];

const managerPermissions = [
  'users.read',
  'documents.read',
  'tasks.read',
  'analytics.read',
  'reports.read',
  'gis.read',
  'files.read',
];

const regularPermissions = [
  'documents.read',
  'tasks.read',
  'analytics.read',
  'gis.read',
  'files.read',
];

function getPermissions(role: TestRole): string[] {
  if (role === 'admin') return adminPermissions;
  if (role === 'manager') return managerPermissions;
  return regularPermissions;
}

async function mockApiForRole(page: Page, role: TestRole) {
  await page.route(`${API_BASE}/**`, async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (url.endsWith('/authentication/refresh-tokens') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-access-token',
          user: {
            id: 100,
            email: `${role}@coescd.local`,
            name: `Test ${role}`,
            role,
            permissions: getPermissions(role),
            department: null,
          },
        }),
      });
      return;
    }

    if (url.endsWith('/reports/my-dashboard') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          scope: role === 'admin' ? 'global' : role === 'manager' ? 'department' : 'self',
          actor: {
            userId: 100,
            role,
            departmentId: role === 'admin' ? null : 1,
            isAnalyst: false,
          },
          widgets: {
            tasks: {
              total: 10,
              inProgress: 3,
              new: 4,
              completed: 3,
              assignedToMe: 2,
              createdByMe: 5,
            },
            edm: {
              documentsTotal: 8,
              documentsInRoute: 4,
              documentsDraft: 2,
              documentsArchived: 2,
              myUnreadAlerts: 1,
              myApprovals: 2,
              overdueStages: 1,
            },
            admin:
              role === 'admin'
                ? {
                    totalUsers: 200,
                    activeUsers: 180,
                    totalDepartments: 12,
                    activeFiles: 420,
                    routeActiveTotal: 33,
                  }
                : undefined,
            department:
              role === 'manager'
                ? {
                    departmentUsers: 20,
                    departmentFiles: 75,
                  }
                : undefined,
            analytics: {
              totalDisasters: 50,
              activeDisasters: 8,
              criticalDisasters: 2,
              monitoringDisasters: 6,
            },
          },
        }),
      });
      return;
    }

    if (url.endsWith('/task') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function setAuthCookies(page: Page) {
  await page.context().addCookies([
    {
      name: 'refreshToken',
      value: 'test-refresh-token',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'csrfToken',
      value: 'test-csrf-token',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test('admin sees admin menu items', async ({ page }) => {
  await mockApiForRole(page, 'admin');
  await setAuthCookies(page);

  await page.goto('/dashboard');

  await expect(page.getByText('Access Control')).toBeVisible();
  await expect(page.getByText('Departments')).toBeVisible();
  await expect(page.getByText('Audit Logs')).toBeVisible();
  await expect(page.getByText('Staff')).toBeVisible();
});

test('manager sees staff but not admin-only menu items', async ({ page }) => {
  await mockApiForRole(page, 'manager');
  await setAuthCookies(page);

  await page.goto('/dashboard');

  await expect(page.getByText('Staff')).toBeVisible();
  await expect(page.getByText('Access Control')).toHaveCount(0);
  await expect(page.getByText('Departments')).toHaveCount(0);
  await expect(page.getByText('Audit Logs')).toHaveCount(0);
});

test('regular cannot open admin access page', async ({ page }) => {
  await mockApiForRole(page, 'regular');
  await setAuthCookies(page);

  await page.goto('/dashboard/access');

  await expect(page.getByText('Доступ ограничен')).toBeVisible();
});

test('next redirect is preserved after sign-in', async ({ page }) => {
  await page.route(`${API_BASE}/authentication/refresh-tokens`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });

  await page.route(`${API_BASE}/authentication/sign-in`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'signed-in-token',
        user: {
          id: 101,
          email: 'regular@coescd.local',
          name: 'Regular User',
          role: 'regular',
          permissions: regularPermissions,
          department: null,
        },
      }),
    });
  });

  await page.route(`${API_BASE}/task`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/dashboard/tasks');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard%2Ftasks/);

  await setAuthCookies(page);

  await page.getByLabel('Email').fill('regular@coescd.local');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard\/tasks$/);
  await expect(page.getByText('Задачи')).toBeVisible();
});

