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

## Endpoints

| Endpoint | Required permission |
| --- | --- |
| `GET /api/customers/me` | authenticated |
| `GET /api/vehicles/me` | authenticated |
| `GET /api/customers`, `GET /api/customers/{id}` | `CUSTOMER_READ` |
| `GET /api/vehicles`, `GET /api/vehicles/{id}` | `VEHICLE_READ` |
| `POST`/`PUT`/`DELETE /api/customers[/{id}]` | `CUSTOMER_CREATE`/`UPDATE`/`DELETE` |
| `POST`/`PUT`/`DELETE /api/vehicles[/{id}]` | `VEHICLE_CREATE`/`UPDATE`/`DELETE` |
| `GET /api/vehicles/{vehicleId}/service-history` | `SERVICE_HISTORY_READ` |
| `POST /api/vehicles/{vehicleId}/service-history` | `SERVICE_HISTORY_CREATE` |

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
