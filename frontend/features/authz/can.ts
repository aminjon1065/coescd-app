import { Role } from '@/enums/RoleEnum';

interface AccessSubject {
  role: Role;
  permissions?: string[];
}

interface AccessRequirement {
  anyPermissions?: string[];
  allPermissions?: string[];
  roles?: Role[];
}

export function can(
  subject: AccessSubject | null | undefined,
  requirement: AccessRequirement,
): boolean {
  if (!subject) {
    return false;
  }

  if (requirement.roles && !requirement.roles.includes(subject.role)) {
    return false;
  }

  const permissions = subject.permissions ?? [];

  if (
    requirement.anyPermissions &&
    requirement.anyPermissions.length > 0 &&
    !requirement.anyPermissions.some((permission) => permissions.includes(permission))
  ) {
    return false;
  }

  if (
    requirement.allPermissions &&
    requirement.allPermissions.length > 0 &&
    !requirement.allPermissions.every((permission) => permissions.includes(permission))
  ) {
    return false;
  }

  return true;
}

