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
- `EUREKA_SERVER_URL` (defaults to `http://localhost:8761/eureka/`)
- `API_GATEWAY_URL` (defaults to `http://localhost:8000`)

Run from this directory with `mvnw.cmd spring-boot:run`, or start the complete
local platform from the repository root with `docker compose up --build`.
Flyway applies the initial schema automatically; Hibernate only validates it.
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
Swagger dropdown. Business CRUD and schedule endpoints are not implemented by
this bootstrap change.

Availability is based on Staff Service schedule data only; it does not account
for bookings or work-order assignments.
