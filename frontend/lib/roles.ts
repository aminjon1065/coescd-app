export const BUSINESS_ROLES = [
  'chairperson',
  'first_deputy',
  'deputy',
  'department_head',
  'division_head',
  'employee',
  'analyst',
  'admin',
] as const;

export type BusinessRoleKey = (typeof BUSINESS_ROLES)[number];

const BUSINESS_ROLE_LABELS: Record<BusinessRoleKey, string> = {
  chairperson: 'Chairperson',
  first_deputy: 'First Deputy',
  deputy: 'Deputy',
  department_head: 'Department Head',
  division_head: 'Division Head',
  employee: 'Employee',
  analyst: 'Analyst',
  admin: 'Admin',
};

function titleFromSnakeCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function labelBusinessRole(role: string): string {
  if (role in BUSINESS_ROLE_LABELS) {
    return BUSINESS_ROLE_LABELS[role as BusinessRoleKey];
  }
  return titleFromSnakeCase(role);
}

export function sortBusinessRoles(roles: string[]): string[] {
  const unique = Array.from(new Set(roles));
  const known = BUSINESS_ROLES.filter((role) => unique.includes(role));
  const unknown = unique
    .filter((role) => !BUSINESS_ROLES.includes(role as BusinessRoleKey))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...unknown];
}

