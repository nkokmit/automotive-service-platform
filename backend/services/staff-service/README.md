# Staff Service

Staff Service owns garage staff profiles, work shifts, recurring schedules,
absences, and one-off schedule exceptions. Its database is `staff_service`;
it must not access another service's database. IDs referring to User Service
are stored as values only, without cross-service foreign keys.

## Local run

The default HTTP port is `8083`. Configure the following environment variables
before starting the service:

- `DB_URL` (defaults to `jdbc:mysql://localhost:3306/staff_service`)
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET` (Base64 that decodes to at least 32 bytes)
- `SCHEDULE_ZONE_ID` (required IANA timezone, for example `Asia/Ho_Chi_Minh`)
- `EUREKA_SERVER_URL` (defaults to `http://localhost:8761/eureka/`)
- `API_GATEWAY_URL` (defaults to `http://localhost:8000`)

Run from this directory with `mvnw.cmd spring-boot:run`, or start the complete
local platform from the repository root with `docker compose up --build`.
Flyway applies schema migrations automatically; Hibernate only validates it.
The MySQL bootstrap script creates this database only when the MySQL data
volume is first initialized. For an existing volume, run
`docker compose exec mysql bash /docker-entrypoint-initdb.d/01-create-databases.sh`
once before starting Staff Service.

## Endpoints and documentation

- Readiness: `/actuator/health/readiness`
- OpenAPI JSON: `/v3/api-docs`
- Swagger UI: `/swagger-ui/index.html`

The Gateway routes `/api/staff/**`, `/api/work-shifts/**`, and
`/api/schedules/**` to this service and includes its OpenAPI document in the
Swagger dropdown.

Staff and work-shift CRUD are available under `/api/staff` and
`/api/work-shifts`. List endpoints accept an optional `isActive` filter;
without it, both active and inactive records are returned. `DELETE` performs
a soft delete, and normal queries hide soft-deleted records. Staff or shifts
marked inactive remain visible; a shift already referenced by a schedule
cannot be soft-deleted and should instead be marked inactive.

Recurring schedules can be read and configured using
`GET /api/staff/{staffId}/recurring-schedules` and
`PUT /api/staff/{staffId}/recurring-schedules`. The PUT request contains an
effective date range and weekly shift assignments. It replaces schedules
inside that range only: existing schedule portions before and after the range
are preserved, while days/shifts omitted from the submitted configuration are
removed inside the range. An empty `weeklySchedules` list clears schedules in
the requested range.

Absence records are managed under `/api/staff/{staffId}/absences`:

- `GET ?from=<ISO-8601>&to=<ISO-8601>` returns absences intersecting the
  half-open UTC interval `[from, to)`.
- `POST` creates an absence; `PUT /{absenceId}` updates it; `DELETE
  /{absenceId}` removes it.
- Absence ranges may partially overlap a shift and overlapping absence
  records are allowed. Schedule aggregation combines their intersecting time
  before subtracting it from work intervals.

One-off schedule exceptions are managed under
`/api/staff/{staffId}/schedule-exceptions`:

- `GET ?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>` lists exceptions in the inclusive
  date range.
- `POST` creates an exception; `PUT /{exceptionId}` updates it; `DELETE
  /{exceptionId}` removes it.
- `CANCEL_SHIFT` is valid only for a shift in the effective recurring schedule
  on that date. `ADD_SHIFT` is valid only when that shift is not already
  scheduled and is active. At most one exception may exist per staff/shift/date.
- Absence timestamps require an ISO-8601 instant with an explicit offset.
  Actor IDs are recorded from the JWT subject when it is a UUID.

The Flyway initial schema already contains the absence and exception tables,
so these endpoints do not require a schema migration.

Aggregated schedules are available at
`GET /api/staff/{staffId}/schedules?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>` and
`GET /api/schedules?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>`. Both date bounds are
inclusive and each request is limited to 31 calendar days. The staff endpoint
returns one entry for every date, including days with no intervals. The garage
endpoint returns only active, non-deleted staff and dates that have work
intervals. Returned intervals retain their shift ID/code/name; adjacent shifts
remain separate. Schedule timestamps are ISO-8601 instants computed using the
required `SCHEDULE_ZONE_ID`. Existing schedules remain interpretable if a
referenced shift is later deactivated or soft-deleted.

`GET /api/staff/availability?startAt=<ISO-8601>&endAt=<ISO-8601>` returns
active, non-deleted staff whose aggregated work intervals continuously cover
the full half-open instant interval `[startAt, endAt)`. Adjacent or overlapping
shifts can jointly provide coverage. The result does not account for bookings
or work-order assignments and does not reserve a staff member.

Schedule calculation applies recurring schedules, then date-specific
`CANCEL_SHIFT`/`ADD_SHIFT` exceptions, then subtracts absences. Time intervals
are half-open; an absence that only touches a shift boundary does not reduce
that shift.
