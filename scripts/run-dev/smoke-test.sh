#!/usr/bin/env bash
# End-to-end smoke test against a running `docker compose up` stack.
# Requires only curl plus standard POSIX text tools (no jq, no python).
#
# Usage: scripts/run-dev/smoke-test.sh
set -uo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:8000}"
USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:8081}"
CUSTOMER_VEHICLE_SERVICE_URL="${CUSTOMER_VEHICLE_SERVICE_URL:-http://localhost:8082}"
DISCOVERY_URL="${DISCOVERY_URL:-http://localhost:8761}"
SEED_USERNAME="${SEED_USERNAME:-admin}"
SEED_PASSWORD="${SEED_PASSWORD:-Admin@123}"

failures=0

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }

http_status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

check_health() {
  local name=$1 url=$2
  local status
  status=$(http_status "$url/actuator/health/readiness")
  if [ "$status" = "200" ]; then pass "$name readiness ($status)"; else fail "$name readiness ($status)"; fi
}

check_public_health_only() {
  local name=$1 url=$2
  # Actuator exposure is limited to health; a non-health endpoint must not be public.
  local status
  status=$(http_status "$url/actuator/env")
  case "$status" in
    401|403) pass "$name non-health actuator endpoint requires auth ($status)" ;;
    404)     pass "$name non-health actuator endpoint is not exposed ($status)" ;;
    *)       fail "$name non-health actuator endpoint leaked ($status)" ;;
  esac
}

echo "== health =="
check_health "discovery-server" "$DISCOVERY_URL"
check_health "user-service" "$USER_SERVICE_URL"
check_health "customer-vehicle-service" "$CUSTOMER_VEHICLE_SERVICE_URL"
check_health "api-gateway" "$GATEWAY_URL"

echo "== actuator exposure =="
check_public_health_only "user-service" "$USER_SERVICE_URL"
check_public_health_only "customer-vehicle-service" "$CUSTOMER_VEHICLE_SERVICE_URL"
check_public_health_only "api-gateway" "$GATEWAY_URL"

echo "== login through gateway =="
login=$(curl -s -X POST "$GATEWAY_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$SEED_USERNAME\",\"password\":\"$SEED_PASSWORD\"}")
access_token=$(printf '%s' "$login" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -n "$access_token" ]; then pass "login returned an access token"; else fail "login failed: $login"; fi

echo "== RBAC =="
if [ -n "$access_token" ]; then
  status=$(http_status "$GATEWAY_URL/api/users" -H "Authorization: Bearer $access_token")
  if [ "$status" = "200" ]; then pass "admin can list users ($status)"; else fail "admin list users ($status)"; fi

  status=$(http_status "$GATEWAY_URL/api/users")
  if [ "$status" = "401" ] || [ "$status" = "403" ]; then pass "anonymous request is rejected ($status)"; else fail "anonymous request ($status)"; fi
fi

echo "== swagger aggregation =="
status=$(http_status "$GATEWAY_URL/v3/api-docs/user-service")
if [ "$status" = "200" ]; then pass "gateway serves user-service OpenAPI ($status)"; else fail "gateway OpenAPI aggregate ($status)"; fi

status=$(http_status "$GATEWAY_URL/v3/api-docs/customer-vehicle-service")
if [ "$status" = "200" ]; then pass "gateway serves customer-vehicle-service OpenAPI ($status)"; else fail "gateway customer-vehicle-service OpenAPI ($status)"; fi

echo "== eureka registration =="
registry=$(curl -s -H 'Accept: application/json' "$DISCOVERY_URL/eureka/apps")
if printf '%s' "$registry" | grep -q '"name":"USER-SERVICE"'; then
  pass "user-service is registered with Eureka"
else
  fail "user-service is not registered with Eureka"
fi

if printf '%s' "$registry" | grep -q '"name":"CUSTOMER-VEHICLE-SERVICE"'; then
  pass "customer-vehicle-service is registered with Eureka"
else
  fail "customer-vehicle-service is not registered with Eureka"
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "All checks passed."
else
  echo "$failures check(s) failed."
  exit 1
fi