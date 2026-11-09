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

The read uses the internal `GET /internal/services/{id}` endpoint with
booking-service's own service token (authority `INTERNAL_SERVICE_CATALOG_READ`);
Customer JWTs are not forwarded, so Customers do not need `SERVICE_READ`.

This read must be synchronous — the caller needs the values immediately to
create the booking.

Work Order Service uses the same internal service-token authority to read
service pricing and the BOM through `/internal/services/{id}` and
`/internal/services/{id}/bom`. These endpoints return catalog snapshots only;
they do not expose inventory database access.

## Work Order integration

When Work Order estimate part lines are approved:

``` text
Work Order
   ↓
PartsReservationRequestedEvent
   ↓
Inventory Service reserves stock
   ↓
PartsReservedEvent / PartsReservationFailedEvent
```

Inventory processes each reservation event idempotently and reserves all
requested parts atomically. Reservation does not deduct on-hand stock; stock
is deducted when reserved parts are issued.

Do not let Work Order Service update inventory tables directly.

## Insufficient stock

Reservation is all-or-nothing. If stock cannot be reserved, Inventory keeps
the failed outcome for the event ID and emits `PartsReservationFailedEvent`;
it must not report a reservation as successful.

## Events

Reservation result events:

``` text
PartsReserved
PartsReservationFailed
```

Reservation does not deduct on-hand stock; deduction happens when reserved
parts are issued.
