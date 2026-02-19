import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const dashboardDir = path.join(rootDir, 'app', 'dashboard');
const policyFile = path.join(rootDir, 'features', 'authz', 'route-path-policies.ts');

const exemptRoutes = new Set([
  '/dashboard',
  '/dashboard/admin',
  '/dashboard/manager',
  '/dashboard/regular',
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function toRoute(filePath) {
  const relative = path.relative(dashboardDir, filePath).replace(/\\/g, '/');
  const withoutPage = relative.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '');
  return withoutPage ? `/dashboard/${withoutPage}` : '/dashboard';
}

function parsePrefixes(fileContent) {
  const matches = [...fileContent.matchAll(/\{\s*prefix:\s*'([^']+)'\s*,\s*policyKey:\s*'([^']+)'\s*\}/g)];
  return matches.map((match) => ({ prefix: match[1], policyKey: match[2] }));
}

const dashboardPages = walk(dashboardDir).filter((file) => file.endsWith('/page.tsx'));
const dashboardRoutes = dashboardPages.map(toRoute);

const policyContent = fs.readFileSync(policyFile, 'utf8');
const policyPrefixes = parsePrefixes(policyContent);

const uncovered = dashboardRoutes.filter((route) => {
  if (exemptRoutes.has(route)) {
    return false;
  }
  return !policyPrefixes.some(
    (entry) => route === entry.prefix || route.startsWith(`${entry.prefix}/`),
  );
});

if (uncovered.length > 0) {
  console.error('Uncovered dashboard routes (missing route-path policy):');
  uncovered.forEach((route) => console.error(`- ${route}`));
  process.exit(1);
}

console.log(`Dashboard policy audit passed: ${dashboardRoutes.length} routes checked.`);

