# AI Coding Workflow

## 1. Goal

Minimize unnecessary context loading and avoid unrelated changes.

AI should work with the smallest sufficient context.

## 2. Workflow

``` text
Task
 ↓
Identify affected service(s)
 ↓
Read GLOBAL_RULES.md
 ↓
Read ARCHITECTURE.md only when architecture/event flow matters
 ↓
Read context file(s) for affected service(s)
 ↓
Inspect relevant source code
 ↓
Find existing similar implementation
 ↓
Inspect migration/entity/API contract if relevant
 ↓
Plan implementation
 ↓
Implement
 ↓
Run focused tests
 ↓
Check regression
 ↓
Report changes
```

## 3. Context loading rules

### Single-service CRUD

Read:

``` text
AI_CONTEXT.md
GLOBAL_RULES.md
SERVICES/<service>.md
```

Do not read all service contexts.

### Cross-service feature

Read only the participating services.

Example:

``` text
Work Order approval → Inventory deduction

GLOBAL_RULES.md
ARCHITECTURE.md
work-order-service.md
inventory-service.md
```

### Kafka change

Read:

``` text
GLOBAL_RULES.md
ARCHITECTURE.md
producer service context
consumer service context
```

### Database-only change

Read:

``` text
GLOBAL_RULES.md
affected service context
```

Then inspect the service's current migration history.

## 4. Repository inspection

Do not scan the entire repository by default.

Start with:

1.  Relevant package.
2.  Related entity.
3.  Repository.
4.  Service.
5.  Controller.
6.  DTO.
7.  Migration.
8.  Tests.

Expand only if necessary.

## 5. Existing implementation first

Before creating new code:

-   Search for similar endpoint.
-   Search for similar entity.
-   Search for similar exception.
-   Search for similar Kafka event.
-   Search for existing mapper/DTO pattern.
-   Search for existing tests.

Follow established project conventions.

## 6. Testing

Run focused tests first.

Example:

``` text
Work Order task
→ Work Order tests
→ related Inventory tests if changed
→ broader test suite when practical
```

Do not repeatedly run the entire project for every small edit.

Never delete or weaken tests just to make the build pass.

## 7. Cross-service changes

If implementation requires a service not mentioned in the task:

1.  Identify why.
2.  Stop before making unrelated architecture changes.
3.  Explain the required cross-service change.
4.  Continue only when it is clearly within the task scope or explicitly
    approved.

## 8. Final report

After implementation, report:

-   Files changed.
-   Main behavior implemented.
-   Database/migration changes.
-   API changes.
-   Kafka/event changes.
-   Tests run and result.
-   Any unresolved issue.

Do not provide a long dump of unchanged code.
