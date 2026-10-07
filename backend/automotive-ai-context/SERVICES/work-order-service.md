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

## Technician assignment

Work Order supports technician assignment.

The exact assignment model must follow the current implementation and
Staff Service contract. Do not invent scheduling/assignment rules not
present in code or requirements.

## Real-time progress

Work Order owns repair progress.

Do not introduce WebSocket/SSE or another transport unless required by
the task or already present in the project.

## Inventory integration

When approved Work Order items require parts:

``` text
Approved items
      ↓
Inventory Service
      ↓
Deduct stock
```

Only approved items consume stock.

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
