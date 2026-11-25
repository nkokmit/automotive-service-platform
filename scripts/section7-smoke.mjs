/* Smoke test Section 7 - customer-vehicle-service (Khach hang & Xe).
 *
 * Chay: node scripts/section7-smoke.mjs
 *
 * Kiem tra cac endpoint cua Section 7 trong API_CONNECTIVITY_ANALYSIS.md:
 *   1. GET  /api/service-history/me            (khach - lich su cua chinh minh)
 *   2. GET  /api/service-history                (nhan vien - lich su ca gara)   [MOI]
 *   3. GET  /api/customers/{id}/service-history (nhan vien - theo khach hang)
 *   4. GET  /api/vehicles/{id}/service-history  (nhan vien - theo xe)
 *   5. POST /api/vehicles/{id}/service-history  (ghi nhan moi)
 *   6. GET  /api/customers, /api/vehicles       (CR danh muc)
 *
 * Bao mat: CUSTOMER khong duoc goi endpoint nhan vien (403), khong co token
 * -> 401. Token that lay tu `.tok` (user-service cap); neu het han, fallback
 * sang tu ky token HS256 voi `sub` = UUID.
 */
import { existsSync, readFileSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const SECRET =
  process.env.JWT_SECRET ??
  "q3PvQ4L4+KCfSsvQjSpIGsCOHUyQ7JEcHQOTD5SOsv1KnBEgbDBgXXKSnouWaufO";
const USER_ID = "10000000-0000-0000-0000-000000000001";
const TOKEN_FILE = process.env.TOKEN_FILE ?? ".tok";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
  const sig = createHmac("sha256", Buffer.from(SECRET, "base64"))
    .update(`${h}.${p}`)
    .digest("base64url");
  return `${h}.${p}.${sig}`;
}

/** Token nhan vien: co SERVICE_HISTORY_READ + quan tri. */
function mintStaffToken() {
  return sign({
    userId: USER_ID,
    authorities: [
      "SERVICE_HISTORY_READ",
      "CUSTOMER_READ",
      "CUSTOMER_WRITE",
      "VEHICLE_READ",
      "VEHICLE_WRITE",
      "ROLE_ADMIN",
    ],
    sub: USER_ID,
  });
}

/**
 * Token khách hàng: chi giu ROLE_CUSTOMER.
 *
 * `ROLE_CUSTOMER` là mệnh đề chặn cuối cùng của các endpoint nhan vien, nên
 * token nay phai bi tu choi o moi endpoint danh cho staff - neu khong, dang
 * fail-open (rò lịch sử cua tat ca khach hang).
 */
function mintCustomerToken() {
  return sign({
    userId: randomUUID(),
    authorities: ["ROLE_CUSTOMER"],
    sub: randomUUID(),
  });
}

function readRealToken() {
  if (!existsSync(TOKEN_FILE)) return null;
  const token = readFileSync(TOKEN_FILE, "utf8").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log(`! Token trong ${TOKEN_FILE} da het han, dung token tu ky`);
      return null;
    }
    return { token, payload };
  } catch {
    return null;
  }
}

const useMint = process.argv.includes("--mint");
const real = useMint ? null : readRealToken();
const STAFF_TOKEN = real?.token ?? mintStaffToken();
const CUSTOMER_TOKEN = mintCustomerToken();

let pass = 0;
let fail = 0;

function ok(label, extra = "") {
  pass++;
  console.log(`  OK   ${label}${extra ? ` - ${extra}` : ""}`);
}

function bad(label, extra = "") {
  fail++;
  console.log(`  FAIL ${label}${extra ? ` - ${extra}` : ""}`);
}

async function call(method, path, body, token = STAFF_TOKEN) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json; charset=utf-8";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function expectOk(label, method, path, body, token = STAFF_TOKEN) {
  const r = await call(method, path, body, token);
  if (r.status >= 200 && r.status < 300) {
    ok(label, `${r.status}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  return r.json?.result;
}

async function expectForbidden(label, method, path, body, token) {
  const r = await call(method, path, body, token);
  if (r.status === 403) {
    ok(label, `403 ${r.json?.message ?? ""}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  return r;
}

/**
 * Lấy mảng bản ghi từ PageResponse.
 *
 * Backend `customer-vehicle-service` dùng field `items` (khác `notification-service`
 * dùng `content`), nên đọc cả hai để script không phụ thuộc vào tên field.
 */
function rowsOf(page) {
  return page?.items ?? page?.content ?? [];
}

console.log("=== Section 7 - Customer Vehicle - Khach hang & Xe ===\n");
console.log(
  `Token: ${real ? `that tu ${TOKEN_FILE} (sub="${real.payload.sub}")` : "TU KY (--mint)"}`,
);
console.log(`Base : ${BASE}\n`);

// -- 1. Danh muc khach hang -------------------------------------------------
console.log("[1] GET /api/customers");
const customers = await expectOk(
  "lay danh sach khach hang",
  "GET",
  "/api/customers?size=50",
);
const custList = rowsOf(customers);
console.log(`       ${custList.length} khach hang / tong ${customers?.totalElements ?? 0}`);
if (custList.length > 0) {
  const c = custList[0];
  if (c.id && c.fullName) ok("CustomerResponse du field", `id=${c.id.slice(0, 8)}`);
  else bad("CustomerResponse thieu field", JSON.stringify(c).slice(0, 200));
}

// -- 2. Danh muc xe ----------------------------------------------------------
console.log("\n[2] GET /api/vehicles");
const vehicles = await expectOk(
  "lay danh sach xe",
  "GET",
  "/api/vehicles?size=50",
);
const vehList = rowsOf(vehicles);
console.log(`       ${vehList.length} xe / tong ${vehicles?.totalElements ?? 0}`);
if (vehList.length > 0) {
  const v = vehList[0];
  if (v.id && v.licensePlate && v.make) {
    ok("VehicleResponse du field", `plate=${v.licensePlate}`);
  } else {
    bad("VehicleResponse thieu field", JSON.stringify(v).slice(0, 200));
  }
}

// -- 3. Lich su ca gara (endpoint moi) --------------------------------------
console.log("\n[3] GET /api/service-history (nhan vien - lich su ca gara)");
const all = await expectOk(
  "lay toan bo lich su bao duong",
  "GET",
  "/api/service-history?size=50",
);
const allItems = rowsOf(all);
console.log(`       ${allItems.length} ban ghi / tong ${all?.totalElements ?? 0}`);
if (allItems.length > 0) {
  const h = allItems[0];
  const hasFields =
    h.id &&
    h.vehicleId &&
    h.recordType &&
    h.serviceDate &&
    h.summary;
  if (hasFields) {
    ok("ServiceHistoryResponse du field", `id=${h.id.slice(0, 8)}`);
  } else {
    bad("ServiceHistoryResponse thieu field", JSON.stringify(h).slice(0, 200));
  }
  // Truong hien thi: bien so / hang / dong xe / ten khach (batch enrichment).
  const enriched = allItems.filter((x) => x.licensePlate);
  if (enriched.length > 0) {
    ok(
      "co truong hien thi (licensePlate/make/model/customerName)",
      `${enriched.length}/${allItems.length} ban ghi co bien so`,
    );
  } else {
    console.log(
      "       (chua co ban ghi nao gắn bien so - bo qua kiem tra enrichment)",
    );
  }
}

// -- 4. Lich su cua chinh minh ------------------------------------------------
console.log("\n[4] GET /api/service-history/me");
const mine = await expectOk(
  "lay lich su bao duong cua toi",
  "GET",
  "/api/service-history/me?size=50",
);
const mineItems = rowsOf(mine);
console.log(`       ${mineItems.length} ban ghi / tong ${mine?.totalElements ?? 0}`);

// -- 5. Lich su theo khach hang ----------------------------------------------
console.log("\n[5] GET /api/customers/{id}/service-history");
if (custList.length > 0) {
  const target = custList[0];
  const byCust = await expectOk(
    `lay lich su cua khach ${target.fullName}`,
    "GET",
    `/api/customers/${target.id}/service-history?size=50`,
  );
  const cItems = rowsOf(byCust);
  console.log(`       ${cItems.length} ban ghi`);
  // Moi ban ghi cua khach phai thuoc ve dung khach do.
  const wrongOwner = cItems.filter((x) => x.customerId !== target.id);
  if (wrongOwner.length === 0) {
    ok("khong ban ghi nao thuoc ve khach khac");
  } else {
    bad("co ban ghi thuoc ve khach khac", `${wrongOwner.length}`);
  }
} else {
  console.log("       (khong co khach hang nao - bo qua)");
}

// -- 6. Lich su theo xe ------------------------------------------------------
console.log("\n[6] GET /api/vehicles/{id}/service-history");
if (vehList.length > 0) {
  const target = vehList[0];
  const byVeh = await expectOk(
    `lay lich su cua xe ${target.licensePlate}`,
    "GET",
    `/api/vehicles/${target.id}/service-history?size=50`,
  );
  const vItems = rowsOf(byVeh);
  console.log(`       ${vItems.length} ban ghi`);
  const wrongVeh = vItems.filter((x) => x.vehicleId !== target.id);
  if (wrongVeh.length === 0) {
    ok("khong ban ghi nao thuoc ve xe khac");
  } else {
    bad("co ban ghi thuoc ve xe khac", `${wrongVeh.length}`);
  }
} else {
  console.log("       (khong co xe nao - bo qua)");
}

// -- 7. Ghi nhan lich su moi -------------------------------------------------
console.log("\n[7] POST /api/vehicles/{id}/service-history");
let createdId = null;
if (vehList.length > 0) {
  const target = vehList[0];
  const marker = `S7-SMOKE-${Date.now()}`;
  const created = await expectOk(
    `ghi nhan lich su moi cho ${target.licensePlate}`,
    "POST",
    `/api/vehicles/${target.id}/service-history`,
    {
      recordType: "EXTERNAL_SERVICE",
      serviceDate: new Date().toISOString(),
      odometerKm: 12345,
      summary: marker,
      description: "Ban ghi kiem thu Section 7 - co the bo qua.",
      garageName: "Smoke Test Garage",
    },
  );
  if (created?.id) {
    createdId = created.id;
    ok("da tao ban ghi moi", `id=${created.id}`);
    if (created.summary === marker) ok("summary khop");
    else bad("summary khong khop", JSON.stringify(created).slice(0, 160));
  } else {
    bad("response khong co id", JSON.stringify(created).slice(0, 200));
  }

  // Ban ghi phai xuat hien trong lich su theo xe.
  const reread = await expectOk(
    "doc lai lich su theo xe sau khi ghi",
    "GET",
    `/api/vehicles/${target.id}/service-history?size=50`,
  );
  const found = rowsOf(reread).some((x) => x.id === createdId);
  if (found) ok("ban ghi moi xuat hien trong lich su theo xe");
  else bad("ban ghi moi khong xuat hien trong lich su theo xe");
} else {
  console.log("       (khong co xe nao - bo qua)");
}

// -- 8. Loai ban ghi khong hop le -------------------------------------------
console.log("\n[8] Validation");
if (vehList.length > 0) {
  const target = vehList[0];
  const r = await call(
    "POST",
    `/api/vehicles/${target.id}/service-history`,
    {
      recordType: "KHONG_CO_NAM",
      serviceDate: new Date().toISOString(),
      summary: "invalid record type",
    },
  );
  if (r.status >= 400 && r.status < 500) {
    ok("recordType sai bi tu choi", `${r.status}`);
  } else {
    bad("recordType sai van duoc phep", `${r.status}`);
  }

  const r2 = await call(
    "POST",
    `/api/vehicles/${target.id}/service-history`,
    {
      recordType: "EXTERNAL_SERVICE",
      serviceDate: new Date().toISOString(),
      summary: "",
    },
  );
  if (r2.status >= 400 && r2.status < 500) {
    ok("summary rong bi tu choi", `${r2.status}`);
  } else {
    bad("summary rong van duoc phep", `${r2.status}`);
  }
}

// -- 9. Bao mat: CUSTOMER khong duoc goi endpoint nhan vien ------------------
console.log("\n[9] Bao mat - token CUSTOMER bi chan o endpoint nhan vien");
if (vehList.length > 0 && custList.length > 0) {
  await expectForbidden(
    "CUSTOMER -> GET /api/service-history",
    "GET",
    "/api/service-history?size=10",
    undefined,
    CUSTOMER_TOKEN,
  );
  await expectForbidden(
    "CUSTOMER -> GET /api/customers/{id}/service-history",
    "GET",
    `/api/customers/${custList[0].id}/service-history`,
    undefined,
    CUSTOMER_TOKEN,
  );
  await expectForbidden(
    "CUSTOMER -> GET /api/vehicles/{id}/service-history",
    "GET",
    `/api/vehicles/${vehList[0].id}/service-history`,
    undefined,
    CUSTOMER_TOKEN,
  );
  await expectForbidden(
    "CUSTOMER -> GET /api/customers",
    "GET",
    "/api/customers",
    undefined,
    CUSTOMER_TOKEN,
  );
  await expectForbidden(
    "CUSTOMER -> GET /api/vehicles",
    "GET",
    "/api/vehicles",
    undefined,
    CUSTOMER_TOKEN,
  );
} else {
  console.log("       (thieu du lieu de test phan quyen - bo qua)");
}

// -- 10. Bao mat: khong co token --------------------------------------------
console.log("\n[10] Bao mat - request khong co token");
for (const [method, path] of [
  ["GET", "/api/service-history/me"],
  ["GET", "/api/service-history"],
  ["GET", "/api/customers"],
  ["GET", "/api/vehicles"],
]) {
  const res = await fetch(`${BASE}${path}`, { method });
  if (res.status === 401 || res.status === 403) {
    ok(`khong token -> ${res.status}`, path);
  } else {
    bad(`khong token van duoc phep (${res.status})`, path);
  }
}

// -- 11. Token khong hop le --------------------------------------------------
console.log("\n[11] Token khong hop le");
{
  const res = await fetch(`${BASE}/api/service-history`, {
    headers: { Authorization: "Bearer not-a-valid-token" },
  });
  if (res.status === 401) ok("token sai -> 401");
  else bad("token sai van duoc phep", `${res.status}`);
}

// -- Ket qua -----------------------------------------------------------------
console.log(`\n=== KET QUA: ${pass} pass, ${fail} fail ===`);
if (createdId) console.log(`Ban ghi test: ${createdId}`);
process.exit(fail === 0 ? 0 : 1);
