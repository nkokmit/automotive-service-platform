# billing-service

## Responsibility

Owns invoices and payments.

## Database

`billing_service`

## Flow

``` text
Work Order Completed
        ↓
Invoice Created
        ↓
Pending Payment
        ↓
Payment
        ↓
Closed
```

## Invoice calculation

Invoice is based on approved:

-   Service/labor items.
-   Parts.

The billing service must not directly query Work Order or Inventory
databases.

Use API/event data according to the existing implementation.

## Ownership

Billing Service owns:

-   Invoice
-   Payment

## Events

Expected events include:

-   InvoiceCreated
-   PaymentCompleted

Use existing event names if already implemented.
