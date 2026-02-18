# Permission Model v1

Last updated: 2026-02-18

## Access Strategy

Use RBAC + ABAC + Delegation:
- RBAC: base permission matrix by role.
- ABAC: department, hierarchy, ownership, document route stage, task assignment.
- Delegation: temporary transfer of authority with strict validity window.

## Core Roles

1. Chairperson
- Global read/write across all departments.
- Can create and finalize cross-department EDM routes.

2. Deputy Chairperson
- Same scope as Chairperson when delegation is active or by explicit permanent role grant.

3. Department Head
- Full control in own department.
- Can assign tasks to subordinates in hierarchy.
- Can delegate department-level signing rights.

4. Department Deputy
- Department scope limited by policy (usually same dept).
- Acts as approver/assignee under delegation or configured policy.

5. Regular Operator
- Own tasks/documents + explicitly shared resources in same scope.

6. System Admin
- IAM/admin operations, user lifecycle, matrix config, audit visibility.
- Not automatically business approver in EDM unless separately granted.

## Resource Scopes

- `global`
- `department`
- `subtree` (department + children)
- `self`
- `shared-by-route` (EDM stage participant)

## Delegation Rules

Delegation record fields:
- `delegatorUserId`
- `delegateUserId`
- `scopeType` (`department` | `global`)
- `scopeDepartmentId` (nullable)
- `permissionSubset` (bounded list)
- `validFrom`, `validTo`
- `status` (`active`, `revoked`, `expired`)

Constraints:
- No circular delegation.
- Delegate cannot delegate above received scope.
- All delegated actions audited with both delegator and delegate context.

## Enforcement Layers

1. API guard layer
- Valid JWT + effective permission contains required permission.

2. Policy layer
- Check ABAC scope predicate on resource query/update.

3. Workflow layer (EDM/Tasks)
- Check stage/assignee ownership and state transition legality.

## Minimal Permission Namespaces

- `edm.*` (document lifecycle, route management)
- `tasks.*`
- `files.*`
- `gis.*`
- `analytics.*`
- `iam.*` (matrix/users/audit)

## Decision Precedence

1. Explicit deny (policy) 
2. Invalid workflow transition
3. Missing permission
4. Scope mismatch
5. Allow

## Audit Requirements

Each protected command logs:
- actor user id
- effective role set
- delegation context (if delegated)
- target resource id/type
- result (success/denied)
- reason code
