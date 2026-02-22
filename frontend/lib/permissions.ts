import type { Permission as AuthzPermission } from '@/features/authz/permissions';

export const Permission = {
  ACCESS_CONTROL: 'access_control',
  ACCESS_CONTROL_MANAGE: 'access_control.manage',
  CHAT_READ: 'chat.read',
  CALLS_READ: 'calls.read',
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  DEPARTMENTS_READ: 'departments.read',
  DEPARTMENTS_CREATE: 'departments.create',
  DEPARTMENTS_UPDATE: 'departments.update',
  DEPARTMENTS_DELETE: 'departments.delete',
  DOCUMENTS_READ: 'documents.read',
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_UPDATE: 'documents.update',
  DOCUMENTS_DELETE: 'documents.delete',
  DOCUMENTS_ROUTE_EXECUTE: 'documents.route.execute',
  DOCUMENTS_ARCHIVE: 'documents.archive',
  DOCUMENTS_AUDIT_READ: 'documents.audit.read',
  DOCUMENTS_REGISTER: 'documents.register',
  DOCUMENTS_JOURNAL_READ: 'documents.journal.read',
  DOCUMENTS_ALERTS_READ: 'documents.alerts.read',
  DOCUMENTS_ALERTS_MANAGE: 'documents.alerts.manage',
  DOCUMENTS_TEMPLATES_READ: 'documents.templates.read',
  DOCUMENTS_TEMPLATES_WRITE: 'documents.templates.write',
  DOCUMENTS_ROUTE_TEMPLATES_READ: 'documents.route.templates.read',
  DOCUMENTS_ROUTE_TEMPLATES_WRITE: 'documents.route.templates.write',
  TASKS_READ: 'tasks.read',
  TASKS_CREATE: 'tasks.create',
  TASKS_UPDATE: 'tasks.update',
  TASKS_DELETE: 'tasks.delete',
  TASKS_ASSIGN: 'tasks.assign',
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_WRITE: 'analytics.write',
  REPORTS_READ: 'reports.read',
  REPORTS_GENERATE: 'reports.generate',
  GIS_READ: 'gis.read',
  GIS_WRITE: 'gis.write',
  FILES_READ: 'files.read',
  FILES_WRITE: 'files.write',
  FILES_DELETE: 'files.delete',
} as const;

export type PermissionValue = AuthzPermission | (typeof Permission)[keyof typeof Permission];

type PermissionSubject = {
  permissions?: string[] | null;
} | null | undefined;

let activePermissionSubject: PermissionSubject = null;

export function setPermissionSubject(subject: PermissionSubject): void {
  activePermissionSubject = subject ?? null;
}

export function hasPermission(permission: string): boolean {
  if (!activePermissionSubject?.permissions) {
    return false;
  }
  return activePermissionSubject.permissions.includes(permission);
}

export function hasAnyPermission(subject: PermissionSubject, permissions: readonly string[]): boolean {
  if (!subject?.permissions?.length) {
    return false;
  }
  return permissions.some((permission) => subject.permissions?.includes(permission));
}

export function hasAllPermissions(subject: PermissionSubject, permissions: readonly string[]): boolean {
  if (!permissions.length) {
    return true;
  }
  if (!subject?.permissions?.length) {
    return false;
  }
  return permissions.every((permission) => subject.permissions?.includes(permission));
}
