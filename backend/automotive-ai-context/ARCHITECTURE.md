# Architecture

## 1. Service boundaries

  -----------------------------------------------------------------------
  Service                             Responsibility
  ----------------------------------- -----------------------------------
  `api-gateway`                       Entry point, routing, JWT
                                      validation

  `discovery-server`                  Service discovery

  `user-service`                      User/account/role/permission

  `staff-service`                     Staff, technician schedules and
                                      staff-related data

  `customer-vehicle-service`          Customer and vehicle data

  `booking-service`                   Appointment booking, reschedule,
                                      cancellation, capacity suggestion

  `work-order-service`                Full repair-order lifecycle; core
                                      business service

  `inventory-service`                 Parts and stock

  `billing-service`                   Invoice and payment

  `notification-service`              Notifications
  -----------------------------------------------------------------------

## 2. Database ownership

Each business service owns its own database.

``` text
user-service              → user_service
staff-service             → staff_service
customer-vehicle-service  → customer_vehicle_service
booking-service           → booking_service
work-order-service        → work_order_service
inventory-service         → inventory_service
billing-service           → billing_service
```

All databases may run on the same MySQL server.

No service may directly query another service's database.

## 3. Communication rule

``` text
Synchronous:
Service A ── OpenFeign/REST ──> Service B

Asynchronous:
Service A ── Event ──> Kafka ──> Service B
```

Default preference:

> Event-driven business flow → Kafka.

Use synchronous communication only when an immediate response is
required.

## 4. Main business flow

``` text
Customer
   ↓
Booking
   ↓
Confirmed
   ↓
Customer arrives
   ↓
Service Advisor Check-in
   ↓
Work Order
   ↓
Diagnosis
   ↓
Estimate
   ↓
Customer selects/approves items
   ↓
In Progress
   ↓
Completed
   ↓
Pending Payment
   ↓
Closed
```

Important:

> `BookingConfirmed` does NOT automatically create a Work Order.

A Work Order is created only when the vehicle is actually checked in by
a Service Advisor.

## 5. Booking

Booking Service:

-   Creates appointments.
-   Calculates workshop receiving capacity.
-   Uses staff schedules from Staff Service to suggest available time
    slots.
-   Handles rescheduling.
-   Handles cancellation.
-   Tracks appointment state.

A confirmed booking can become a no-show. Therefore, it must not create
a Work Order automatically.

## 6. Check-in

When the customer arrives:

``` text
Service Advisor
      ↓
Check-in
      ↓
Work Order Service
```

The Work Order must capture real vehicle intake information, including:

-   `bookingId`
-   Current odometer
-   Vehicle condition at reception
-   Other required intake information

`bookingId` allows the Work Order to inherit booking information such as
customer, vehicle and customer notes.

After creation, Work Order Service publishes an event such as:

``` text
WorkOrderCreated
```

or:

``` text
VehicleCheckedIn
```

Booking Service consumes it and changes the booking to:

``` text
Fulfilled
```

## 7. Work Order state machine

``` text
Created / Draft
       ↓
Diagnosing
       ↓
Pending Approval
       │
       ├── Reject all → Canceled
       │
       ↓
In Progress
       ↓
Completed
       ↓
Pending Payment
       ↓
Closed
```

### State meanings

-   `Created / Draft`: vehicle has been checked in.
-   `Diagnosing`: technicians inspect the vehicle and identify required
    work/parts.
-   `Pending Approval`: estimate has been sent to customer.
-   `In Progress`: approved work is being performed.
-   `Completed`: repair work is finished.
-   `Pending Payment`: invoice exists and payment is pending.
-   `Closed`: payment completed and vehicle is ready/released.
-   `Canceled`: customer rejects all work or the work order is otherwise
    canceled according to business rules.

## 8. Partial estimate approval

Customer can approve/reject individual estimate items.

Example:

``` text
Replace oil       → Approved
Replace brake pad → Approved
Replace tire      → Rejected
```

Only approved items proceed to execution.

## 9. Supplementary estimate

During repair, new problems may be discovered.

Flow:

``` text
In Progress
   ↓
New problem discovered
   ↓
Supplementary Estimate
   ↓
Customer approval
   ├── Approved → execute item
   └── Rejected → do not execute item
```

## 10. Inventory rule

Inventory Service is the source of truth for stock.

Parts are deducted from stock when the corresponding Work Order/estimate
items are approved.

Because approval can be partial:

> Only parts belonging to approved items are deducted.

Work Order Service must not directly modify Inventory Service's
database.

## 11. Billing rule

Billing Service owns:

-   Invoice
-   Payment

Main flow:

``` text
WorkOrderCompleted
        ↓
Billing Service
        ↓
Invoice
        ↓
Pending Payment
        ↓
Payment
        ↓
Closed
```

Invoice total is based on approved services/labor and approved parts.

## 12. Notification rule

Notification Service consumes relevant events and sends notifications.

Examples:

``` text
BookingCreated
BookingConfirmed
WorkOrderCreated
EstimateCreated
EstimateApproved
RepairCompleted
InvoiceCreated
PaymentCompleted
```

Notification Service is not the owner of business transactions.

## 13. Real-time work-order progress

Work Order Service owns repair progress.

The exact transport for real-time client updates is not fixed here
unless already implemented in code. Do not invent WebSocket/SSE
infrastructure without a task requiring it.

## 14. Event ownership

The service that owns a business state publishes the event.

Examples:

``` text
Booking Service
  → BookingConfirmed
  → BookingCancelled
  → BookingRescheduled

Work Order Service
  → WorkOrderCreated
  → WorkOrderCompleted
  → EstimateCreated
  → EstimateApproved
  → VehicleCheckedIn

Inventory Service
  → StockDeducted
  → InsufficientStock

Billing Service
  → InvoiceCreated
  → PaymentCompleted
```

These event names are architectural guidance. Before implementation,
inspect the existing code/contracts and preserve existing naming if
already established.

## 15. Cross-service consistency

Do not use distributed JPA transactions.

Do not use another service's DB as a read model unless an explicit
architecture decision exists.

Use events for eventual consistency.

Use synchronous calls when immediate validation/data is required.
