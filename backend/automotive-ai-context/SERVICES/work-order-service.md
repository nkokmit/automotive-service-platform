# work-order-service

## Responsibility

This is the **core business service** of the garage system.

It manages the full vehicle repair lifecycle:

``` text
Vehicle Check-in
   ↓
Estimate
   ↓
Customer approval
   ↓
Technician assignment
   ↓
Repair progress
   ↓
Completion
   ↓
Billing/payment completion
```

## Database

`work_order_service`

## Work Order creation

A Work Order is created only when a Service Advisor checks in the
vehicle.

Required intake information includes:

-   `bookingId`
-   `customerId`
-   `vehicleId`
-   Current odometer
-   Vehicle condition at reception
-   Relevant customer notes/inherited booking information

Do not create Work Orders automatically from `BookingConfirmed`.

## State machine

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

## Estimate

An estimate may contain multiple items.

Customer can approve individual items.

Example:

``` text
Item A → Approved
Item B → Approved
Item C → Rejected
```

Only approved items are executed.

Work Order Service snapshots service and part details when adding a service
to an estimate. It reads service pricing and the current BOM synchronously
from Inventory Service through the internal catalog endpoints; it does not
read Inventory Service's database. BOM-generated part lines retain their
source service-line ID as an indexed, non-FK reference so removing a service
removes only its generated parts, not manually added part lines. The estimate
remains the owning relationship for every part line; source-line cleanup is
performed transactionally by Work Order Service.

New service and BOM part lines start in `PENDING`. Services can be added only
to a `DRAFT` estimate. Manually added parts are snapshotted from Inventory
Service's internal part catalog, including the requested quantity and current
selling price; they can be added only to a `DRAFT` estimate. Service and part
lines can be removed while the estimate is `DRAFT` or `PENDING_APPROVAL`;
estimates with a final decision cannot be modified through these operations.
Submitting an initial estimate moves a `DIAGNOSING` Work Order to
`PENDING_APPROVAL`. Submitting a supplementary estimate while its Work Order
is `IN_PROGRESS` leaves the Work Order status unchanged.

## Supplementary estimate

If a new problem is discovered during repair:

``` text
In Progress
   ↓
New issue
   ↓
Supplementary Estimate
   ↓
Customer decision
   ├── Approved → execute
   └── Rejected → skip
```

Create an initial estimate only while the Work Order is `DIAGNOSING`; create
a supplementary estimate only while it is `IN_PROGRESS`. Submitting a
supplementary estimate does not change the Work Order status.

## Technician assignment

Work Order supports technician assignment.

`assignedTechId` stores the Staff Service `staffId`, not the User Service
`userId`. Resolve the authenticated mechanic through Staff Service's
`GET /api/staff/by-user/{userId}` endpoint. Assignment is allowed for approved
service lines on an in-progress Work Order; validate the referenced staff
profile is active. Only the assigned mechanic may start or complete that
service line. Do not introduce scheduling rules.

Service line progress is `APPROVED → IN_PROGRESS → COMPLETED`; persist
`completed_at` when marking a line complete.

## Real-time progress

Work Order owns repair progress.

Do not introduce WebSocket/SSE or another transport unless required by
the task or already present in the project.

## Inventory integration

When an Estimate is finalized and approved Work Order part lines require
parts:

``` text
Approved part lines
      ↓
PartsReservationRequestedEvent
      ↓
Inventory Service reserves stock
      ↓
PartsReservedEvent / PartsReservationFailedEvent
```

Only approved part lines are sent for reservation. Work Order records the
reservation result asynchronously; it never assumes reservation succeeded.
Stock is deducted later when parts are issued.

Work Order Service must never modify Inventory DB directly.

## Billing integration

When repair is completed:

``` text
WorkOrderCompleted
      ↓
Billing Service
      ↓
Invoice
      ↓
Payment
      ↓
Closed
```

Billing owns Invoice and Payment.

## Events

Expected domain events include:

-   WorkOrderCreated
-   VehicleCheckedIn
-   EstimateCreated
-   EstimateApproved
-   WorkOrderCompleted

Use existing project event names if already implemented.
