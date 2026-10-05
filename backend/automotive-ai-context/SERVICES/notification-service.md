# notification-service

## Responsibility

Consumes domain events and sends notifications.

## Database

No business database ownership is currently defined in this context.

## Behavior

Notification Service should not participate directly in core business
transactions.

Example:

``` text
BookingConfirmed
      ↓
Kafka
      ↓
Notification Service
      ↓
Notification
```

Relevant events may include:

-   BookingConfirmed
-   BookingCancelled
-   WorkOrderCreated
-   EstimateCreated
-   EstimateApproved
-   WorkOrderCompleted
-   InvoiceCreated
-   PaymentCompleted

The actual event contract in code takes precedence.

Do not introduce new notification channels or providers unless
requested.
