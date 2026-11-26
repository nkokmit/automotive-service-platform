/**
 * Tao mau test thanh toan (billing-service).
 *
 * Chay: node scripts/seed-payment-demo.mjs
 *
 * Muc dich: dua he thong ve trang thai "san sang de test thanh toan" —
 *   1. Tao lich hen (booking) cho khach hang
 *   2. Check-in tai xuong
 *   3. Tao Work Order tu booking
 *   4. Tao Estimate + them dich vu, submit, duyet
 *   5. Chuyen Work Order sang IN_PROGRESS, hoan thanh service line
 *   6. Complete Work Order -> PENDING_PAYMENT
 *   7. Tao hoa don tu Work Order
 *   8. Ghi nhan thanh toan -> PAID
 *
 * Ket qua: in ra INVOICE_ID + PAYMENT_ID de dung tay trong UI admin
 * (/admin/billing) hoac goi them lenh refund.
 *
 * Bien moi truong:
 *   BASE_URL        mac dinh http://localhost:8000
 *   JWT_SECRET      fallback khi khong doc duoc token that tu .tok
 *   TOKEN_FILE      mac dinh .tok
 *   CUSTOMER_ID     customer_id de dung (mac dinh lay tu booking co san)
 */
import { existsSync, readFileSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const SECRET =
  process.env.JWT_SECRET ??
  "q3PvQ4L4+KCfSsvQjSpIGsCOHUyQ7JEcHQOTD5SOsv1KnBEgbDBgXXKSnouWaufO";
const ADMIN_ID = "10000000-0000-0000-0000-000000000001";
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

/** Token staff: can day du quyen cua ca chuoi billing. */
function mintAdminToken() {
  return sign({
    userId: ADMIN_ID,
    authorities: [
      "BOOKING_AVAILABILITY_READ",
      "BOOKING_CANCEL",
      "BOOKING_CHECK_IN",
      "BOOKING_CREATE",
      "BOOKING_READ",
      "BOOKING_RESCHEDULE",
      "BOOKING_STATUS_UPDATE",
      "CUSTOMER_BOOKING_CANCEL",
      "CUSTOMER_BOOKING_CREATE",
      "CUSTOMER_BOOKING_READ",
      "CUSTOMER_CREATE",
      "CUSTOMER_READ",
      "CUSTOMER_UPDATE",
      "ESTIMATE_CREATE",
      "ESTIMATE_DECISION_RECORD",
      "ESTIMATE_READ",
      "ESTIMATE_SUBMIT",
      "ESTIMATE_UPDATE",
      "INVENTORY_TRANSACTION_READ",
      "INVOICE_READ",
      "INVOICE_WRITE",
      "PART_ISSUE",
      "PART_READ",
      "PART_RELEASE",
      "PART_WRITE",
      "PAYMENT_READ",
      "PAYMENT_REFUND",
      "PAYMENT_WRITE",
      "PURCHASE_ORDER_READ",
      "SERVICE_HISTORY_CREATE",
      "SERVICE_HISTORY_READ",
      "SERVICE_LINE_ASSIGN",
      "SERVICE_LINE_COMPLETE",
      "SERVICE_LINE_READ_ASSIGNED",
      "SERVICE_LINE_START",
      "SERVICE_READ",
      "SERVICE_WRITE",
      "STAFF_READ",
      "STOCK_WRITE",
      "SUPPLIER_READ",
      "USER_READ",
      "VEHICLE_CREATE",
      "VEHICLE_READ",
      "VEHICLE_UPDATE",
      "WORK_ORDER_CANCEL",
      "WORK_ORDER_COMPLETE",
      "WORK_ORDER_CREATE",
      "WORK_ORDER_DIAGNOSIS_START",
      "WORK_ORDER_READ",
      "ROLE_ADMIN",
    ],
    sub: ADMIN_ID,
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
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

const TOKEN = readRealToken() ?? mintAdminToken();

async function call(method, path, body, token = TOKEN) {
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
  if (res.status >= 400) {
    throw new Error(
      `${method} ${path} -> ${res.status}: ${json?.message ?? JSON.stringify(json).slice(0, 300)}`,
    );
  }
  return json?.result ?? json;
}

function rowsOf(page) {
  return page?.items ?? page?.content ?? [];
}

console.log("=== Tao mau test thanh toan ===\n");
console.log(`Base : ${BASE}`);
console.log(`Token: ${readRealToken() ? `that tu ${TOKEN_FILE}` : "TU KY"}\n`);

// -- 1. Chon khach + xe ------------------------------------------------------
console.log("[1] Chon khach hang va xe");
const customers = rowsOf(await call("GET", "/api/customers?size=50"));
const vehicles = rowsOf(await call("GET", "/api/vehicles?size=50"));
if (customers.length === 0 || vehicles.length === 0) {
  console.log("!! Can it nhat 1 khach hang va 1 xe trong he thong.");
  process.exit(1);
}
const customer = customers[0];
const vehicle = vehicles[0];
console.log(`       khach : ${customer.fullName ?? customer.id}`);
console.log(`       xe    : ${vehicle.licensePlate} (${vehicle.make} ${vehicle.model})`);

// -- 2. Chon dich vu ---------------------------------------------------------
console.log("\n[2] Chon dich vu");
// Uu tien dich vu can IT KY THUAT VIEN (required_techs = 1) — neu chon
// dich vu can 2+ ky thuat vien se khong co slot trong (suc chua xuong theo
// lich ca cua nhan vien).
const services = rowsOf(
  await call("GET", "/api/services?size=50&sortBy=name"),
);
if (services.length === 0) {
  console.log("!! Chua co dich vu nao trong inventory-service.");
  process.exit(1);
}
const active = services.filter((s) => s.isActive !== false);
const singleTech =
  active.find((s) => (s.required_techs ?? 1) <= 1) ?? active[0] ?? services[0];
const service = singleTech;
console.log(
  `       dich vu: ${service.name} (${service.code}) - can ${service.required_techs ?? 1} ky thuat vien`,
);

// -- 3. Tao lich hen ---------------------------------------------------------
console.log("\n[3] Tim khung gio con trong va tao lich hen");
// Availability tra ve cac slot con du suc chua cho tung service.
//
// Luu y ve ngay hien tai: ca sang 08:00-12:00 va ca chieu 13:00-17:00 (gio
// VN) la cua 1 ky thuat vien duy nhat dang co lich. neu ban chay script sau
// 17:00 VN thi het slot hom nay -> dung BOOKING_ID de tro lai mot lich hen da
// check-in san (buoc [3b]).
if (process.env.BOOKING_ID) {
  const existing = await call(
    "GET",
    `/api/staff/bookings/${process.env.BOOKING_ID}`,
  );
  console.log(`       dung lai booking: ${existing.code ?? existing.id}`);
  var booking = existing;
} else {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const slots = await call(
    "GET",
    `/api/bookings/availability?from=${todayStr}&to=${todayStr}` +
      `&serviceIds=${service.id}`,
  );
  if (!slots || slots.length === 0) {
    console.log("!! Khong con khung gio trong hom nay.");
    console.log("   - Chay lai sau khi ca lam viec bat dau (8:00 hoac 13:00 gio VN), hoac");
    console.log("   - dat BOOKING_ID=<id> de tro lai mot lich hen da check-in san.");
    process.exit(1);
  }
  const slot = slots[0];
  console.log(`       slot: ${slot.startAt}`);

  // WALK_IN: khach dang dung tai quay, gio bat dau co the lui 15 phút so voi
  // hien tai (xem StaffBookingServiceImpl.validateSourceAndStart).
  booking = await call("POST", "/api/staff/bookings", {
    source: "WALK_IN",
    customerId: customer.id,
    licensePlate: vehicle.licensePlate,
    serviceIds: [service.id],
    startAt: slot.startAt,
    customerNote: "Mau test thanh toan",
  });
  console.log(`       booking: ${booking.code ?? booking.id}`);
}

// -- 4. Check-in -------------------------------------------------------------
console.log("\n[4] Chuyen lich hen sang CHECKED_IN");
if (booking.status === "CHECKED_IN") {
  console.log("       booking da CHECKED_IN — bo qua");
} else {
  await call(
    "PATCH",
    `/api/staff/bookings/${booking.id}/status`,
    { status: "CONFIRMED", reason: "Xac nhan qua mang" },
  );
  // CHECKED_IN khong dat truc tiep qua PATCH /status — phai dung
  // endpoint tiep nhan xe (check-in) rieng.
  await call("POST", `/api/staff/bookings/${booking.id}/check-in`, {
    vehicleId: vehicle.id,
    odometerIn: 18000,
    vehicleCondition: "Xe vao xuong, san xep moi",
  });
  console.log("       OK");
}

// -- 5. Tao Work Order -------------------------------------------------------
console.log("\n[5] Tao Work Order");
const workOrder = await call("POST", "/api/work-orders", {
  bookingId: booking.id,
  odometerIn: 18000,
  vehicleCondition: "Xe vao xuong, san xep moi",
});
console.log(`       work order: ${workOrder.code}`);

// -- 6. Estimate + duyet -----------------------------------------------------
console.log("\n[6] Estimate + duyet");
const woNow = await call("GET", `/api/work-orders/${workOrder.id}`);
let estimateId = null;

// Work Order co the da co san (idempotent theo bookingId) va da o trang thai
// IN_PROGRESS/PENDING_PAYMENT — khi do khong tao lai Estimate.
if (["CREATED"].includes(woNow.status)) {
  await call("POST", `/api/work-orders/${workOrder.id}/start-diagnosis`);
  const estimate = await call("POST", `/api/work-orders/${workOrder.id}/estimates`, {
    type: "INITIAL",
  });
  estimateId = estimate.id;
  await call("POST", `/api/estimates/${estimate.id}/services`, {
    serviceId: service.id,
    quantity: 1,
  });
  await call("POST", `/api/estimates/${estimate.id}/submit`);
  await call("PATCH", `/api/estimates/${estimate.id}/decision`, {
    decision: "APPROVED",
  });
  console.log("       da tao va duyet estimate moi");
} else {
  // Lay estimate da duyet gan nhat.
  const estimates = await call(
    "GET",
    `/api/work-orders/${workOrder.id}/estimates`,
  );
  const list = Array.isArray(estimates) ? estimates : [];
  const approved = list.find((e) => e.status === "APPROVED") ?? list[0];
  estimateId = approved?.id ?? null;
  console.log(
    `       Work Order da o ${woNow.status} — dung estimate san: ${approved?.code ?? "khong co"}`,
  );
}

// -- 7. Hoan thanh service line ---------------------------------------------
console.log("\n[7] Hoan thanh service line");
if (estimateId) {
  const est = await call("GET", `/api/estimates/${estimateId}`);
  const lines = est?.serviceLines ?? [];
  for (const line of lines) {
    if (line.status === "COMPLETED" || line.status === "REJECTED") continue;
    if (line.status === "APPROVED") {
      // Service line can duoc gan mechanic truoc khi bat dau.
      await call("POST", `/api/work-order-service-lines/${line.id}/assign`, {
        mechanicId: line.assignedTechId ?? undefined,
      });
    }
    if (line.status === "APPROVED" || line.status === "IN_PROGRESS") {
      await call("POST", `/api/work-order-service-lines/${line.id}/start`);
    }
    await call("POST", `/api/work-order-service-lines/${line.id}/complete`);
    console.log(`       line ${line.snapshotName ?? line.id} -> COMPLETED`);
  }
} else {
  console.log("       bo qua (khong co estimate de xu ly)");
}

// -- 8. Complete Work Order --------------------------------------------------
console.log("\n[8] Hoan thanh Work Order -> PENDING_PAYMENT");
const woBefore = await call("GET", `/api/work-orders/${workOrder.id}`);
if (woBefore.status === "PENDING_PAYMENT" || woBefore.status === "CLOSED") {
  console.log(`       Work Order da o ${woBefore.status} — bo qua`);
} else {
  await call("POST", `/api/work-orders/${workOrder.id}/complete`);
  console.log("       OK");
}

// -- 9. Tao hoa don ----------------------------------------------------------
console.log("\n[9] Tao hoa don tu Work Order");
const invoice = await call(
  "POST",
  `/api/invoices/from-work-order/${workOrder.id}`,
);
console.log(`       hoa don: ${invoice.code}`);
console.log(`       tong cong: ${invoice.grandTotal}`);

// -- 10. Ghi nhan thanh toan -------------------------------------------------
console.log("\n[10] Ghi nhan thanh toan");
const payment = await call("POST", "/api/payments", {
  invoiceId: invoice.id,
  idempotencyKey: randomUUID(),
  paymentMethod: "CASH",
  amount: Number(invoice.grandTotal),
  transactionRef: "TX-" + Date.now(),
  note: "Thanh toan mau test",
});
console.log(`       thanh toan: ${payment.code}`);

// -- 11. Kiem tra hoa don sau khi thanh toan ---------------------------------
console.log("\n[11] Kiem tra trang thai hoa don");
const after = await call("GET", `/api/invoices/${invoice.id}`);
console.log(`       status : ${after.status}`);
console.log(`       paid   : ${after.paidAmount} / ${after.grandTotal}`);

console.log("\n=== HOAN TAT ===");
console.log(`INVOICE_ID=${invoice.id}`);
console.log(`PAYMENT_ID=${payment.id}`);
console.log(`WORK_ORDER_ID=${workOrder.id}`);
console.log(`CUSTOMER_ID=${customer.id}`);
console.log(`VEHICLE_ID=${vehicle.id}`);
console.log("\nGoi lenh refund (tu test):");
console.log(
  `  curl -X POST ${BASE}/api/payments/${payment.id}/refund -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"reason":"test"}'`,
);
