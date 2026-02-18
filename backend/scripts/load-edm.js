/* eslint-disable no-console */
const autocannon = require('autocannon');

const API_BASE_URL = process.env.LOAD_API_URL || 'http://localhost:8008/api';
const LOAD_EMAIL = process.env.LOAD_USER_EMAIL || 'edm-manager1@test.local';
const LOAD_PASSWORD = process.env.LOAD_USER_PASSWORD || 'manager123';
const LOAD_CONNECTIONS = Number(process.env.LOAD_CONNECTIONS || 30);
const LOAD_DURATION_SECONDS = Number(process.env.LOAD_DURATION_SECONDS || 20);

async function signIn() {
  const response = await fetch(`${API_BASE_URL}/authentication/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: LOAD_EMAIL,
      password: LOAD_PASSWORD,
    }),
  });
  if (!response.ok) {
    throw new Error(`Sign-in failed with status ${response.status}`);
  }
  const data = await response.json();
  if (!data.accessToken) {
    throw new Error('No accessToken in sign-in response');
  }
  return data.accessToken;
}

function runScenario(name, token, path) {
  console.log(`\n[LOAD] ${name}: GET ${path}`);
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${API_BASE_URL}${path}`,
        method: 'GET',
        connections: LOAD_CONNECTIONS,
        duration: LOAD_DURATION_SECONDS,
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
    autocannon.track(instance, { renderProgressBar: true });
  });
}

function printSummary(name, result) {
  console.log(
    `[RESULT] ${name}: avg=${result.requests.average} req/s, p95=${result.latency.p95} ms, errors=${result.errors}, timeouts=${result.timeouts}`,
  );
}

async function main() {
  console.log(`[LOAD] API: ${API_BASE_URL}`);
  console.log(
    `[LOAD] user=${LOAD_EMAIL}, connections=${LOAD_CONNECTIONS}, duration=${LOAD_DURATION_SECONDS}s`,
  );

  const token = await signIn();
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date().toISOString();

  const scenarios = [
    {
      name: 'EDM documents list',
      path: '/edm/documents?page=1&limit=50&status=in_route',
    },
    {
      name: 'EDM my approvals queue',
      path: '/edm/queues/my-approvals?page=1&limit=50',
    },
    {
      name: 'EDM alerts list',
      path: '/edm/alerts/my?page=1&limit=50',
    },
    {
      name: 'EDM dashboard report',
      path: `/edm/reports/dashboard?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}&topManagers=10`,
    },
  ];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario.name, token, scenario.path);
    printSummary(scenario.name, result);
  }
}

main().catch((error) => {
  console.error('[LOAD] Failed:', error);
  process.exitCode = 1;
});
