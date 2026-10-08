# user-service

## Responsibility

Owns user/account/role/permission data.

## Database

`user_service`

## Rules

-   Own user, role and permission data.
-   Do not expose its DB to other services.
-   Cross-service consumers use IDs/API/events.
-   Existing user/role/permission soft-delete behavior must be preserved
    if those entities remain in the implementation.
-   Before changing APIs, inspect the current controller/DTO/response
    contract.

## Soft delete

Existing implementation uses soft delete for:

-   User
-   Role
-   Permission

Do not generalize this rule to every future entity automatically.

When extending this pattern, follow the existing entity, migration and
repository implementation.

## API

The previous context contained a detailed user API. Treat the current
code as the source of truth before changing endpoints; do not blindly
recreate an old API list.

## Authorization

Every endpoint is guarded by `@PreAuthorize` with `hasAuthority(...)`
against the permission names seeded in `V4__seed_data.sql`. Do not
replace these with `hasRole(...)` checks: role membership and permission
grant are separate concerns in this model.

| Endpoint | Required authority |
| --- | --- |
| `POST /api/auth/login` | public |
| `POST /api/auth/register` | public |
| `POST /api/auth/refresh-token` | public |
| `POST /api/auth/logout` | authenticated |
| `GET /api/users`, `GET /api/users/{id}` | `USER_READ` |
| `GET /api/users/me` | authenticated |
| `POST /api/users` | `USER_CREATE` |
| `PUT /api/users/{id}` | `USER_UPDATE` |
| `POST /api/users/{id}/roles`, `DELETE /api/users/{id}/roles/{roleId}` | `USER_UPDATE` |
| `DELETE /api/users/{id}` | `USER_DELETE` |
| `GET /api/roles`, `GET /api/roles/{id}` | `ROLE_READ` |
| `POST`/`PUT`/`DELETE /api/roles[/{id}]` | `ROLE_WRITE` |
| `POST /api/roles/{id}/permissions`, `DELETE /api/roles/{id}/permissions/{permissionId}` | `ROLE_WRITE` |
| `GET /api/permissions`, `GET /api/permissions/{id}` | `PERMISSION_READ` |
| `POST`/`PUT`/`DELETE /api/permissions[/{id}]` | `PERMISSION_WRITE` |

Access-denied responses go through `CustomAccessDeniedHandler`, which
returns `403` with the standard response envelope and code `1403`. This
handler is required: `@PreAuthorize` throws before the MVC layer, so
`GlobalExceptionHandler` never sees the failure and a default Spring
error body would otherwise leak to clients.

The API Gateway only validates the JWT (GLOBAL_RULES §6); it does not
enforce permissions, so authorization must stay in this service.

## Privilege escalation guard

`UserServiceImpl.resolveRoles()` rejects any request that assigns the
`ADMIN` role unless the caller already holds `ROLE_ADMIN`. It covers
`createUser`, `updateUser` and `assignRoles`, since all three resolve
roles through that method.

Keep this guard when adding role assignment paths. `USER_CREATE` and
`USER_UPDATE` are deliberately not sufficient to grant admin.

Note: `ROLE_WRITE` still allows editing any role's permission set, so a
caller holding it can grant itself permissions. That is intentional in
the current permission model; tighten it only alongside a decision on
what `ROLE_WRITE` should mean.

## Permission grants

The eight seeded permissions are currently granted to `ADMIN` only.
Other roles (`MANAGER`, `MECHANIC`, `CUSTOMER`) therefore have no
endpoint access beyond their own profile via `GET /api/users/me`.

Granting more permissions is a schema/data decision: add a new Flyway
migration. Do not edit `V4__seed_data.sql`.
