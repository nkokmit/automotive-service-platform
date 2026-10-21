# customer-vehicle-service

## Responsibility

Owns customer and vehicle data.

## Database

`customer_vehicle_service`

## Rules

-   Own customer records.
-   Own vehicle records.
-   Other services reference customer/vehicle by ID.
-   Do not create cross-service JPA relationships.
-   Work Order stores `customerId` and `vehicleId` as identifiers where
    needed.
-   Booking may reference customer/vehicle IDs.

## Customer contacts

Customer phone and email are not unique: contacts may be shared or reused.
Phone is nullable for profiles created from registrations without a phone
number. The columns have non-unique indexes for searching.

When a `UserRegistered` event matches an unlinked, manually entered customer
by email or phone, the existing profile is retained but marked inactive; a
new active profile linked to the user is created. Inactive customers remain
searchable in the general customer listing unless the caller explicitly
filters `isActive=true`.

## Endpoints

| Endpoint                                          | Required permission |
|---------------------------------------------------| --- |
| `GET /api/customers/me`                           | authenticated |
| `GET /api/service-history/me`                     | authenticated |
| `GET /api/customers`, `GET /api/customers/{id}`   | `CUSTOMER_READ` |
| `GET /api/vehicles`, `GET /api/vehicles/{id}`     | `VEHICLE_READ` |
| `POST`/`PUT`/`DELETE /api/customers[/{id}]`       | `CUSTOMER_CREATE`/`UPDATE`/`DELETE` |
| `POST`/`PUT`/`DELETE /api/vehicles[/{id}]`        | `VEHICLE_CREATE`/`UPDATE`/`DELETE` |
| `GET /api/customers/{customerId}/service-history` | `SERVICE_HISTORY_READ` and not `ROLE_CUSTOMER` |
| `GET /api/vehicles/{vehicleId}/service-history`   | `SERVICE_HISTORY_READ` |
| `POST /api/vehicles/{vehicleId}/service-history`  | `SERVICE_HISTORY_CREATE` |

## Customer self-service

A `CUSTOMER` holds only `SERVICE_HISTORY_READ` (V6 of user-service). It has
no `CUSTOMER_READ` and no `VEHICLE_READ`, so the list and detail GETs are
closed to it by the permission checks alone — no extra role check needed.

Identity bridging: the JWT `sub` is a username, but `customers.user_id`
stores a `user-service` UUID. `user-service` therefore puts a `userId` claim
in the access token, and `CurrentCustomerService` maps that claim to a
customer row. Anything that prevents that mapping — missing claim (a token
issued before the claim existed), a non-UUID claim, no linked customer, or a
soft-deleted customer — fails closed with 403.

Ownership is enforced where the data is read, not in the controller:
`ServiceHistoryServiceImpl` compares the caller's customer id against the
vehicle's owner. A vehicle belonging to someone else yields
`VehicleNotFoundException` (404), never 403, so the endpoint cannot be used
to probe which ids exist. `Vehicle.customer` is `LAZY` and `open-in-view` is
off, so only `getCustomer().getId()` may be read.

`/me` endpoints take no filter parameters on purpose — the garage-wide
filters (`customerId`, `keyword`, `licensePlate`) belong to the staff
listing endpoints.

## Staff service history by customer

`GET /api/customers/{customerId}/service-history` answers "every time this
person brought a car in", across all their vehicles. It is the second way to
read the same rows as `GET /api/vehicles/{vehicleId}/service-history`: the
vehicle view is technical history of one car, this is service history of one
person. Same `ServiceHistoryService.getServiceHistoryByCustomer` call, no new
service method and no user-service migration — `SERVICE_HISTORY_READ` was
already seeded (V5) and granted to `ADMIN`/`MANAGER`/`MECHANIC`, and already
revoked from `CUSTOMER` by V7.

Two authorization clauses, and the second one is not redundant:

- `hasAuthority('SERVICE_HISTORY_READ')` closes the door in today's
  configuration, since V7 removed that permission from `CUSTOMER`.
- `not hasAuthority('ROLE_CUSTOMER')` repeats the role check that
  `ServiceHistoryServiceImpl#requireCallerIsNotCustomer` applies to the
  vehicle endpoint. `customerId` here comes from the URL, so a future
  migration that re-grants `SERVICE_HISTORY_READ` to `CUSTOMER` would
  otherwise turn this endpoint into a way to read every customer's history by
  guessing ids, while the vehicle endpoint would stay protected. V6 is proof
  that this re-grant has happened before. Checking the role rather than the
  permission keeps the guarantee independent of the permission data.

The cost of the second clause: a user holding both a staff role and
`ROLE_CUSTOMER` is blocked here too. That is accepted — this is a data
protection boundary and failing closed wins; such a user still reads their own
history through `/api/service-history/me`.

No existence check on `customerId`, unlike the vehicle endpoint which returns
2101. Two reasons: history must stay readable for soft-deleted customers so
staff can audit an old profile (the history table carries no
`@SQLRestriction`), and on `/me` a missing customer is already rejected by
`CurrentCustomerService`. The accepted trade-off is that an unknown
`customerId` returns 200 with an empty page instead of 404 — this endpoint is
deliberately not an existence oracle, and customers cannot reach it at all.

Sorting is fixed to `serviceDate` descending and pagination takes only `page`
and `size`. Accepting a `sortBy` would let a client push the most recent visit
to the bottom of a "recent service history" screen. The repository method
`findByCustomerIdOrderByServiceDateDesc` already encodes that order.

No gateway change was needed: `/api/customers/**` was already routed to this
service.
