# inventory-service

## Responsibility

Owns parts and stock.

## Database

`inventory_service`

## Source of truth

Inventory Service is the only owner of stock quantities.

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
