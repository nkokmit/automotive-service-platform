# inventory-service

## Responsibility

Owns the service catalog, the parts catalog and stock.

- `services` / `service_categories`: the catalog of garage services. This is
  the source of truth for service duration and technician requirement.
- `parts` / `part_categories`: the parts catalog and stock quantities.
- `service_boms`: the default parts required by each service.
- `part_vehicle_compatibilities`: which parts fit which vehicle models.
- `suppliers`, `purchase_orders`: purchasing and goods receipt.
- `inventory_transactions`: the stock audit ledger.

## Database

`inventory_service`

## Source of truth

Inventory Service is the only owner of stock quantities.

## Booking integration

Booking Service needs the service catalog to compute appointment duration
and staffing. It reads `id`, `name`, `is_active`, `duration_minutes` and
`required_techs`, then stores a snapshot on the booking so later catalog
changes do not rewrite booking history.

This read must be synchronous — the caller needs the values immediately to
create the booking.

## Work Order integration

When Work Order estimate items are approved:

``` text
Work Order
   ↓
Approved part items
   ↓
Inventory Service
   ↓
Deduct stock
```

Only approved items consume stock.

Do not let Work Order Service update inventory tables directly.

## Insufficient stock

The existing project behavior should determine the exact failure/event
contract. Do not invent a distributed transaction.

## Events

Potential event:

``` text
StockDeducted
```

Use the existing event contract if one exists.
