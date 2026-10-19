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

## User contact uniqueness

`users.email` is required and unique. `users.phone` is optional and unique
when present; the database allows multiple `NULL` phone values. The unique
constraints include soft-deleted accounts, so deleting an account does not
release its email or phone for reuse. User create, update and registration
validate these values, with database constraints protecting concurrent writes.

After a registration transaction commits, `user-service` publishes a
`UserRegistered` event to Kafka. `customer-vehicle-service` consumes the
event and creates the matching customer profile asynchronously.

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

`V5__seed_customer_vehicle_permissions.sql` adds the ten
customer-vehicle-service permissions for `ADMIN` (all ten), `MANAGER` and
`MECHANIC` (vehicle and service-history ones), and deliberately grants
`CUSTOMER` nothing.

`V6__grant_customer_self_service_reads.sql` grants `CUSTOMER` exactly one
of them: `SERVICE_HISTORY_READ`. That is enough for the customer
self-service endpoints in customer-vehicle-service, which filter by owner.
`CUSTOMER_READ` and `VEHICLE_READ` stay ungranted on purpose — they expose
garage-wide listings.

Granting more permissions is a schema/data decision: add a new Flyway
migration. Do not edit `V4__seed_data.sql`.

## Access token claims

`JwtService.generateToken` writes `authorities` plus a `userId` claim
holding the account UUID as a string. `customer-vehicle-service` needs it
because `customers.user_id` stores a UUID while the token `sub` is a
username; without the claim that service cannot tell whose records it is
serving. The claim is omitted when the principal is not a `User` with an
id. Tokens issued before this change lack the claim and are rejected by
the consumer, so they must be allowed to expire.
