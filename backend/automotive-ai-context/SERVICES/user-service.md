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
