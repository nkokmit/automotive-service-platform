# booking-service

## Responsibility

Booking Service manages appointments.

### Core responsibilities

-   Create booking.
-   Confirm booking.
-   Reschedule booking.
-   Cancel booking.
-   Calculate workshop receiving capacity.
-   Use staff schedules from Staff Service to suggest available slots.
-   Handle no-show/reality gap between appointment and actual vehicle
    arrival.

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
