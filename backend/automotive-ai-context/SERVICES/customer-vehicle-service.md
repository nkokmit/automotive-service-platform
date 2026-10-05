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
