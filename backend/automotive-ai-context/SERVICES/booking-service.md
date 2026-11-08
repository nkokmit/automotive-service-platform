# booking-service

## Responsibility

Booking Service manages appointments.

### Core responsibilities

-   Create booking.
-   Confirm booking.
-   List and read bookings belonging to the authenticated customer.
-   Reschedule booking.
-   Cancel booking.
-   Calculate workshop receiving capacity.
-   Use staff schedules from Staff Service to suggest available slots, via the internal
    `GET /internal/schedules` endpoint using booking-service's own service token
    (authority `INTERNAL_STAFF_CAPACITY_READ`); Customer JWTs are never forwarded to Staff Service,
    so Customers do not need `STAFF_SCHEDULE_READ`.
-   Handle no-show/reality gap between appointment and actual vehicle
    arrival.

Customer booking management resolves the current Customer profile from
Customer-Vehicle Service; clients cannot choose a `customerId`. Only future
`CONFIRMED` bookings can be cancelled or rescheduled. Rescheduling retains
the booked service snapshots and checks capacity while excluding the
booking's current demand. Cancellation is idempotent and releases capacity
by moving the booking to `CANCELLED`.

## API permissions

Booking endpoints authorize by permission rather than by role. User-service
grants these permissions through role-to-permission assignments:

- Customer APIs: `BOOKING_AVAILABILITY_READ`,
  `CUSTOMER_BOOKING_CREATE`, `CUSTOMER_BOOKING_READ`,
  `CUSTOMER_BOOKING_CANCEL`, and `CUSTOMER_BOOKING_RESCHEDULE`.
- Staff APIs: `BOOKING_READ`, `BOOKING_CREATE`, `BOOKING_CANCEL`,
  `BOOKING_RESCHEDULE`, `BOOKING_STATUS_UPDATE`, and `BOOKING_CHECK_IN`.

The role assignment is intentionally limited to `CUSTOMER` for customer
permissions and `MANAGER` for staff permissions.

## Database

`booking_service`

## Critical business rule

A confirmed booking does **not** create a Work Order.

Reason:

-   Customer may no-show.
-   Work Order requires real intake information.
-   Odometer is only known at check-in.
-   Vehicle condition must be recorded by Service Advisor.

## Check-in flow

``` text
Booking Confirmed
      ↓
Customer arrives
      ↓
Service Advisor Check-in
      ↓
Work Order Service creates Work Order
      ↓
WorkOrderCreated / VehicleCheckedIn
      ↓
Booking Service
      ↓
Fulfilled
```

## Cross-service data

Use IDs, not JPA relationships.

The Work Order stores `bookingId` so it can inherit booking information.

## Events

Existing event names in code take precedence. Architecture currently
expects events around:

-   BookingConfirmed
-   BookingCancelled
-   BookingRescheduled
-   WorkOrderCreated / VehicleCheckedIn
