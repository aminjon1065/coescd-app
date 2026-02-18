# Roles Permissions Matrix (Wave 1 Baseline)

Last updated: 2026-02-18

## 1. Purpose
This document is the single source of truth for role permissions in Wave 1.
No endpoint or frontend action may be delivered without explicit mapping in this matrix.

## 2. Role Mapping
Current backend roles (`Role` enum):
- `admin`
- `manager`
- `regular`

Product role mapping for Wave 1:
- `Admin` -> backend `admin`
- `DepartmentHead` -> backend `manager`
- `Employee` -> backend `regular`
- `Analyst` -> backend `regular` + explicit analytics/gis permissions (custom grants)

Future role candidates (Wave 3+):
- `Chairman`
- `Deputy`

## 3. Scope Model
- `self`: own resources only.
- `department`: own department resources.
- `global`: all resources.

Scope precedence:
1. explicit deny
2. missing permission
3. scope mismatch
4. allow

## 4. Permission Domains
- `documents.*` (EDM)
- `tasks.*`
- `files.*`
- `users.*`
- `departments.*`
- `reports.*`
- `chat.*` (planned)
- `video.*` (planned)
- `disaster.*` (planned)
- `gis.*` (planned)
- `ops.*`

## 5. Matrix (Wave 1 Mandatory)

### 5.1 Dashboard and Navigation
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| Open own dashboard | Allow (global) | Allow (department) | Allow (self/department widgets) | Allow (self/department + analyst widgets) |
| Open admin dashboard widgets | Allow (global) | Deny | Deny | Deny |
| Open analyst widgets | Optional | Optional | Deny | Allow |

### 5.2 EDM (Core)
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| View EDM documents | Allow (global) | Allow (department + own) | Allow (self/assigned/shared) | Allow (as Employee + analyst grants) |
| Create EDM draft | Allow (global) | Allow (department) | Deny by default | Optional by policy |
| Update EDM draft | Allow (global) | Allow (department + own) | Deny by default | Optional by policy |
| Submit to route | Allow (global) | Allow (department + own) | Deny by default | Optional by policy |
| Execute route stage | Allow (global) | Allow (stage-assigned + department head cases) | Allow (only assigned stage) | Allow (same as Employee) |
| Archive approved document | Allow (global) | Allow (department) | Deny | Optional by policy |
| Read document audit | Allow (global) | Allow (department) | Deny | Optional by policy |

### 5.3 Tasks
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| View tasks | Allow (global) | Allow (department + own) | Allow (self assigned/created) | Allow (as Employee) |
| Create task | Allow (global) | Allow (department) | Deny by default | Optional by policy |
| Assign subordinate tasks | Allow (global) | Allow (department only) | Deny | Deny |
| Update task status (assigned) | Allow | Allow | Allow (self assigned) | Allow |

### 5.4 Files
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| Upload file | Allow | Allow | Allow | Allow |
| Read file | Allow (global) | Allow (department/shared) | Allow (self/shared) | Allow |
| Share file | Allow (global) | Allow (department scope) | Allow (self-owned only) | Allow |
| Delete file | Allow (global) | Allow (department policy) | Allow (self-owned only) | Allow |

### 5.5 Staff (Wave 1 critical constraint)
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| View users | Allow (global) | Allow (department) | Deny by default | Deny by default |
| Create user | Allow (global) | Allow (department only) | Deny | Deny |
| Update user role | Allow (global) | Deny | Deny | Deny |
| Disable user | Allow (global) | Deny | Deny | Deny |

### 5.6 Ops / Reports
| Capability | Admin | DepartmentHead | Employee | Analyst |
|---|---|---|---|---|
| Read EDM reports | Allow (global) | Allow (department) | Deny | Allow (department/global by grant) |
| Read ops metrics/backup | Allow (global) | Deny | Deny | Deny |

## 6. Wave 1 Non-Negotiable Rule
`DepartmentHead` can create users only in own department.

Backend acceptance checks:
- If `actor.role != admin` and `target.departmentId != actor.departmentId` -> `403`.
- DepartmentHead cannot assign `admin` role.
- DepartmentHead cannot modify users outside department.

## 7. API Annotation Rule
For each endpoint, maintain all three:
1. permission requirement (decorator)
2. scope assertion (service/policy)
3. e2e forbidden scenario

## 8. QA Checklist
- For every row with `Deny`, there must be at least one 403 e2e test.
- For every row with `Allow`, there must be at least one successful e2e test.
- Admin global access and DepartmentHead scope limits must be validated in every module.

