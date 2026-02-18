/* eslint-disable no-console */
const autocannon = require('autocannon');

const API_BASE_URL = process.env.LOAD_API_URL || 'http://localhost:8008/api';
const LOAD_DURATION_SECONDS = Number(process.env.LOAD_DURATION_SECONDS || 30);
const LOAD_STRICT_ROLES =
  String(process.env.LOAD_STRICT_ROLES || 'false').toLowerCase() === 'true';
const LOAD_ROLES = (process.env.LOAD_ROLES || 'manager,operator,admin')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const MANAGER_CONNECTIONS = Number(process.env.LOAD_MANAGER_CONNECTIONS || 24);
const OPERATOR_CONNECTIONS = Number(process.env.LOAD_OPERATOR_CONNECTIONS || 18);
const ADMIN_CONNECTIONS = Number(process.env.LOAD_ADMIN_CONNECTIONS || 8);

const managerCreds = {
  emails: (process.env.LOAD_MANAGER_EMAILS || process.env.LOAD_MANAGER_EMAIL || 'edm-manager1@test.local,manager@test.local')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  passwords: (process.env.LOAD_MANAGER_PASSWORDS || process.env.LOAD_MANAGER_PASSWORD || 'manager123')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
};
const operatorCreds = {
  emails: (process.env.LOAD_OPERATOR_EMAILS || process.env.LOAD_OPERATOR_EMAIL || 'edm-regular1@test.local,operator@test.local')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  passwords: (process.env.LOAD_OPERATOR_PASSWORDS || process.env.LOAD_OPERATOR_PASSWORD || 'operator123')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
};
const adminCreds = {
  emails: (process.env.LOAD_ADMIN_EMAILS || process.env.LOAD_ADMIN_EMAIL || 'edm-admin@test.local,admin@test.local')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  passwords: (process.env.LOAD_ADMIN_PASSWORDS || process.env.LOAD_ADMIN_PASSWORD || 'admin123')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
};

async function signIn(creds) {
  const response = await fetch(`${API_BASE_URL}/authentication/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Sign-in failed for ${creds.email} with status ${response.status}`,
    );
  }
  const data = await response.json();
  if (!data.accessToken) {
    throw new Error(`No accessToken for ${creds.email}`);
  }
  return data.accessToken;
}

async function resolveTokenForRole(roleName, creds) {
  let lastError = null;
  for (const email of creds.emails) {
    for (const password of creds.passwords) {
      try {
        const token = await signIn({ email, password });
        console.log(`[LOAD] role=${roleName} auth ok as ${email}`);
        return token;
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (LOAD_STRICT_ROLES) {
    throw lastError || new Error(`Failed to authenticate role=${roleName}`);
  }
  console.warn(
    `[LOAD] role=${roleName} skipped: no valid credentials found (set LOAD_${roleName.toUpperCase()}_EMAILS / PASSWORDS)`,
  );
  return null;
}

function todayIsoRange() {
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date().toISOString();
  return { fromDate, toDate };
}

function buildRoleRequests(role) {
  const { fromDate, toDate } = todayIsoRange();
  if (role === 'manager') {
    return [
      { method: 'GET', path: '/edm/documents?page=1&limit=50&status=in_route' },
      { method: 'GET', path: '/edm/queues/my-approvals?page=1&limit=50' },
      { method: 'GET', path: '/edm/alerts/my?page=1&limit=50&status=unread' },
      {
        method: 'GET',
        path: `/edm/reports/dashboard?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&topManagers=10`,
      },
      { method: 'GET', path: '/edm/registration-journal?page=1&limit=50' },
    ];
  }
  if (role === 'operator') {
    return [
      { method: 'GET', path: '/edm/documents?page=1&limit=50' },
      { method: 'GET', path: '/edm/alerts/my?page=1&limit=50' },
      { method: 'GET', path: '/task?page=1&limit=50' },
    ];
  }
  return [
    { method: 'GET', path: '/ops/metrics?windowMinutes=15' },
    { method: 'GET', path: '/ops/backup/status' },
    {
      method: 'GET',
      path: `/edm/reports/sla?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
    },
    { method: 'POST', path: '/edm/alerts/process' },
  ];
}

function runRoleLoad(params) {
  const { roleName, token, connections } = params;
  const requests = buildRoleRequests(roleName).map((request) => ({
    ...request,
    headers: {
      authorization: `Bearer ${token}`,
    },
  }));

  console.log(
    `[LOAD] role=${roleName} connections=${connections} duration=${LOAD_DURATION_SECONDS}s requests=${requests.length}`,
  );

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: API_BASE_URL,
        connections,
        duration: LOAD_DURATION_SECONDS,
        requests,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ roleName, result });
      },
    );
    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printSummary(summary) {
  const { roleName, result } = summary;
  console.log(
    `[RESULT] role=${roleName} avg=${result.requests.average} req/s p95=${result.latency.p95}ms errors=${result.errors} timeouts=${result.timeouts} 2xx=${result['2xx'] || 0} 4xx=${result['4xx'] || 0} 5xx=${result['5xx'] || 0}`,
  );
}

async function main() {
  console.log(`[LOAD] API=${API_BASE_URL}`);
  console.log(
    `[LOAD] profile connections: manager=${MANAGER_CONNECTIONS}, operator=${OPERATOR_CONNECTIONS}, admin=${ADMIN_CONNECTIONS}`,
  );

  const managerToken = LOAD_ROLES.includes('manager')
    ? await resolveTokenForRole('manager', managerCreds)
    : null;
  const operatorToken = LOAD_ROLES.includes('operator')
    ? await resolveTokenForRole('operator', operatorCreds)
    : null;
  const adminToken = LOAD_ROLES.includes('admin')
    ? await resolveTokenForRole('admin', adminCreds)
    : null;

  const jobs = [];
  if (managerToken) {
    jobs.push(
      runRoleLoad({
        roleName: 'manager',
        token: managerToken,
        connections: MANAGER_CONNECTIONS,
      }),
    );
  }
  if (operatorToken) {
    jobs.push(
      runRoleLoad({
        roleName: 'operator',
        token: operatorToken,
        connections: OPERATOR_CONNECTIONS,
      }),
    );
  }
  if (adminToken) {
    jobs.push(
      runRoleLoad({
        roleName: 'admin',
        token: adminToken,
        connections: ADMIN_CONNECTIONS,
      }),
    );
  }
  if (!jobs.length) {
    throw new Error(
      'No roles authenticated. Provide valid credentials via LOAD_*_EMAILS and LOAD_*_PASSWORDS.',
    );
  }

  const results = await Promise.all(jobs);

  console.log('\n[LOAD] Summary');
  for (const summary of results) {
    printSummary(summary);
  }
}

main().catch((error) => {
  console.error('[LOAD] Failed:', error);
  process.exitCode = 1;
});
