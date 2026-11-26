/* Smoke test Section 5 — billing-service (hóa đơn & thanh toán).
 *
 * Chạy: node scripts/section5-smoke.mjs
 *
 * Script dùng token đăng nhập thật trong `.tok` (do user-service cấp, `sub` =
 * "admin" — username KHÔNG phải UUID). Đây chính là token gây ra 2 lỗi backend
 * đã được sửa:
 *   1. billing-service đọc `jwt.getSubject()` (= username "admin") thay vì claim
 *      `userId` (UUID) → UUID.fromString("admin") ném IllegalArgumentException.
 *   2. Ghi outbox_events trong cùng transaction với nghiệp vụ → Hibernate
 *      merge gây StaleObjectStateException.
 *
 * Nếu `.tok` không tồn tại hoặc hết hạn, script fallback sang tự ký token HS256
 * với `sub` = UUID (chế độ `--mint`).
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

/** Token HS256 với `sub` = UUID — chỉ dùng khi không có token đăng nhập thật. */
function mintToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    userId: USER_ID,
    authorities: [
      "INVOICE_READ",
      "INVOICE_WRITE",
      "PAYMENT_READ",
      "PAYMENT_WRITE",
      "PAYMENT_REFUND",
      "WORK_ORDER_READ",
    ],
    sub: USER_ID,
    iat: now,
    exp: now + 3600,
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", Buffer.from(SECRET, "base64"))
    .update(`${h}.${p}`)
    .digest("base64url");
  return `${h}.${p}.${sig}`;
}

function readRealToken() {
  if (!existsSync(TOKEN_FILE)) return null;
  const token = readFileSync(TOKEN_FILE, "utf8").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log(`! Token trong ${TOKEN_FILE} đã hết hạn, dùng token tự ký (--mint)`);
      return null;
    }
    return { token, payload };
  } catch {
    return null;
  }
}

const useMint = process.argv.includes("--mint");
const real = useMint ? null : readRealToken();
const TOKEN = real?.token ?? mintToken();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json; charset=utf-8",
};

let pass = 0;
let fail = 0;

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
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

function ok(label, extra = "") {
  pass++;
  console.log(`  OK   ${label}${extra ? ` - ${extra}` : ""}`);
}

function bad(label, extra = "") {
  fail++;
  console.log(`  FAIL ${label}${extra ? ` - ${extra}` : ""}`);
}

/** Endpoint phải trả 2xx. */
async function expectOk(label, method, path, body) {
  const r = await call(method, path, body);
  if (r.status >= 200 && r.status < 300) {
    ok(label, `${r.status}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  }
  return r.json.result;
}

/** Endpoint phải bị backend từ chối (4xx) — không phải 500. */
async function expectRejected(label, method, path, body) {
  const r = await call(method, path, body);
  if (r.status >= 400 && r.status < 500) {
    ok(label, `${r.status} ${r.json?.message ?? ""}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  }
  return r;
}

console.log("=== Section 5 - Billing - Hoa don & Thanh toan ===\n");
console.log(
  `Token: ${real ? `that tu ${TOKEN_FILE} (sub="${real.payload.sub}")` : "TU KY (--mint)"}`,
);
console.log(`Base : ${BASE}\n`);

// -- 1. Tra cuu hoa don ----------------------------------------------------
console.log("[1] Tra cuu hoa don");
const page = await expectOk("GET /api/invoices", "GET", "/api/invoices?size=50");
console.log(
  `       ${page?.items?.length ?? 0} hoa don / tong ${page?.totalElements ?? 0} / ${page?.totalPages ?? 0} trang`,
);
await expectOk(
  "GET /api/invoices?status=UNPAID",
  "GET",
  "/api/invoices?status=UNPAID&size=20",
);
await expectOk(
  "GET /api/invoices?from&to",
  "GET",
  "/api/invoices?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z&size=20",
);
await expectOk("GET /api/invoices/me", "GET", "/api/invoices/me?size=5");

const invoices = page?.items ?? [];
const target =
  invoices.find((i) => i.status === "UNPAID" && Number(i.paidAmount) === 0) ??
  invoices.find((i) => i.status !== "VOID");
if (!target) {
  console.log("\nKhong co hoa don nao de thao tac - dung kiem thu.");
  process.exit(1);
}
console.log(`\n       Dung hoa don ${target.code} (${target.grandTotal})`);

const detail = await expectOk(
  "GET /api/invoices/{id}",
  "GET",
  `/api/invoices/${target.id}`,
);
console.log(
  `       ${detail?.items?.length ?? 0} dong hang / ${detail?.payments?.length ?? 0} thanh toan / ${detail?.status}`,
);

// -- 2. Tao hoa don tu work order (idempotent) -------------------------------
console.log("\n[2] Tao hoa don tu work order");
const pendingWo = (
  await expectOk(
    "GET /api/work-orders?status=PENDING_PAYMENT",
    "GET",
    "/api/work-orders?status=PENDING_PAYMENT&size=20",
  )
)?.items?.[0];

if (pendingWo) {
  const created = await expectOk(
    `POST /api/invoices/from-work-order (${pendingWo.code})`,
    "POST",
    `/api/invoices/from-work-order/${pendingWo.id}`,
  );
  console.log(`       -> ${created?.code} ${created?.grandTotal} ${created?.status}`);

  const again = await expectOk(
    "POST /api/invoices/from-work-order (idempotent)",
    "POST",
    `/api/invoices/from-work-order/${pendingWo.id}`,
  );
  if (again?.id === created?.id) {
    ok("Tao lai tra ve cung hoa don (idempotent)", again?.code);
  } else {
    bad("Tao lai tra ve cung hoa don (idempotent)", `${again?.code}`);
  }
} else {
  console.log("       SKIP - khong co work order PENDING_PAYMENT");
}

// -- 3. Cap nhat chiet khau ------------------------------------------------
console.log("\n[3] Cap nhat chiet khau");
const maxDiscount =
  Number(detail.subtotalLabor) +
  Number(detail.subtotalParts) +
  Number(detail.taxAmount);

const discounted = await expectOk(
  "PATCH /api/invoices/{id}/discount",
  "PATCH",
  `/api/invoices/${target.id}/discount`,
  { discountAmount: 50000, note: "chiet khau smoke" },
);
if (Number(discounted?.grandTotal) === maxDiscount - 50000) {
  ok("Tong cong tinh lai dung", `${maxDiscount} - 50000 = ${discounted?.grandTotal}`);
} else {
  bad("Tong cong tinh lai dung", `${discounted?.grandTotal}`);
}

await expectRejected(
  "PATCH discount vuot han muc",
  "PATCH",
  `/api/invoices/${target.id}/discount`,
  { discountAmount: maxDiscount + 1, note: "vuot han muc" },
);

await expectOk(
  "PATCH /api/invoices/{id}/discount (reset ve 0)",
  "PATCH",
  `/api/invoices/${target.id}/discount`,
  { discountAmount: 0, note: "reset smoke" },
);

// -- 4. Ghi nhan thanh toan ------------------------------------------------
console.log("\n[4] Ghi nhan thanh toan");
const balance = Number(detail.grandTotal) - Number(detail.paidAmount);
const key1 = randomUUID();

const payment = await expectOk(
  "POST /api/payments (tra mot phan)",
  "POST",
  "/api/payments",
  {
    invoiceId: target.id,
    idempotencyKey: key1,
    paymentMethod: "CASH",
    amount: 200000,
    transactionRef: "SMOKE-TXN-1",
    note: "thanh toan smoke",
  },
);
console.log(`       -> ${payment?.code} ${payment?.amount} ${payment?.status}`);

const paymentAgain = await expectOk(
  "POST /api/payments (cung idempotencyKey)",
  "POST",
  "/api/payments",
  {
    invoiceId: target.id,
    idempotencyKey: key1,
    paymentMethod: "CASH",
    amount: 200000,
  },
);
if (paymentAgain?.id === payment?.id) {
  ok("Thanh toan lan 2 tra ve cung giao dich", paymentAgain?.code);
} else {
  bad("Thanh toan lan 2 tra ve cung giao dich", paymentAgain?.code);
}

const afterPartial = await expectOk(
  "GET /api/invoices/{id} (sau khi tra mot phan)",
  "GET",
  `/api/invoices/${target.id}`,
);
if (afterPartial?.status === "PARTIALLY_PAID") {
  ok("Hoa don chuyen sang PARTIALLY_PAID");
} else {
  bad("Hoa don chuyen sang PARTIALLY_PAID", afterPartial?.status);
}

await expectRejected(
  "POST /api/payments vuot so du",
  "POST",
  "/api/payments",
  {
    invoiceId: target.id,
    idempotencyKey: randomUUID(),
    paymentMethod: "CASH",
    amount: balance + 1000000,
  },
);

// Tra du so du con lai -> PAI + ghi outbox (BUG-OUTBOX neu 500).
const payFull = await call("POST", "/api/payments", {
  invoiceId: target.id,
  idempotencyKey: randomUUID(),
  paymentMethod: "BANK_TRANSFER",
  amount: balance - 200000,
  transactionRef: "SMOKE-TXN-2",
});
if (payFull.status < 300) {
  ok("POST /api/payments (tra du so du)", `${payFull.status}`);
  const paid = await expectOk(
    "GET /api/invoices/{id} (sau khi tra du)",
    "GET",
    `/api/invoices/${target.id}`,
  );
  if (paid?.status === "PAID") ok("Hoa don chuyen sang PAID");
  else bad("Hoa don chuyen sang PAID", paid?.status);
} else {
  bad(
    "POST /api/payments (tra du so du)",
    `${payFull.status} ${JSON.stringify(payFull.json).slice(0, 120)}`,
  );
}

// -- 5. Huy hoa don da thanh toan -> phai bi chan ---------------------------
console.log("\n[5] Huy hoa don");
await expectRejected(
  "POST /api/invoices/{id}/void (da thanh toan)",
  "POST",
  `/api/invoices/${target.id}/void`,
  { reason: "thu huy" },
);

// -- 6. Hoan tien ----------------------------------------------------------
console.log("\n[6] Hoan tien");
const refund = await call("POST", `/api/payments/${payment.id}/refund`, {
  reason: "hoan tien smoke",
});
if (refund.status < 300) {
  ok("POST /api/payments/{id}/refund", `${refund.status}`);
  if (refund.json?.result?.status === "REFUNDED") {
    ok("Thanh toan chuyen sang REFUNDED");
  } else {
    bad("Thanh toan chuyen sang REFUNDED", refund.json?.result?.status);
  }
} else {
  bad(
    "POST /api/payments/{id}/refund",
    `${refund.status} ${JSON.stringify(refund.json).slice(0, 120)}`,
  );
}

await expectRejected(
  "POST /api/payments/{id}/refund (hoan 2 lan)",
  "POST",
  `/api/payments/${payment.id}/refund`,
  { reason: "lan 2" },
);

// -- 7. Don dep ------------------------------------------------------------
console.log("\n[7] Don dep");
const cleaned = await expectOk(
  "GET /api/invoices/{id} (truoc don dep)",
  "GET",
  `/api/invoices/${target.id}`,
);
for (const p of cleaned?.payments ?? []) {
  if (p.status === "SUCCEEDED") {
    await call("POST", `/api/payments/${p.id}/refund`, { reason: "don dep smoke" });
  }
}
const afterClean = await expectOk(
  "GET /api/invoices/{id} (sau don dep)",
  "GET",
  `/api/invoices/${target.id}`,
);
console.log(`       status=${afterClean?.status} paid=${afterClean?.paidAmount}`);

const voided = await call("POST", `/api/invoices/${target.id}/void`, {
  reason: "Don dep smoke test",
});
if (voided.status < 300) {
  ok("POST /api/invoices/{id}/void (don dep)", `${voided.status}`);
  console.log(`       -> ${voided.json?.result?.status}`);
} else {
  bad(
    "POST /api/invoices/{id}/void (don dep)",
    `${voided.status} ${JSON.stringify(voided.json).slice(0, 120)}`,
  );
}

console.log(`\n=== Ket qua: ${pass} pass / ${fail} fail ===`);
if (fail > 0) process.exit(1);

