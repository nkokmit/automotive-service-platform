# staff-service

## Responsibility

Owns staff/technician information and staff schedules.

## Database

`staff_service`

## Important business role

Booking Service uses staff scheduling information to calculate workshop
capacity and suggest available appointment slots.

## Rules

-   Own staff data.
-   Own staff schedules.
-   Do not allow other services to access the staff database directly.
-   Expose required data through API/events according to the existing
    implementation.
-   Do not create duplicate staff entities in other services.
