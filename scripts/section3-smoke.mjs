/* Script kiểm thử nhanh các API Section 3 (inventory-service) qua gateway.
 * Chạy: node scripts/section3-smoke.mjs
 */
import { readFileSync } from "node:fs";

const token = readFileSync(".tok", "utf8").trim();
const BASE = "http://localhost:8000";
/**
 * Hậu tố duy nhất cho mỗi lần chạy — mã nhà cung cấp / SKU là UNIQUE trong
 * DB nên script phải chạy lại được nhiều lần mà không đụng dữ liệu cũ.
 */
const RUN = Date.now().toString(36).toUpperCase().slice(-6);
const H = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json; charset=utf-8",
};

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

function log(label, r) {
  const ok = r.status < 400;
  console.log(`${ok ? "OK  " : "FAIL"} ${label} -> ${r.status}`);
  if (!ok) console.log("     ", JSON.stringify(r.json).slice(0, 300));
  return r.json.result;
}

// ── 1. Nhà cung cấp ─────────────────────────────────────────────────────────
const sup = log(
  "POST /api/suppliers",
  await call("POST", "/api/suppliers", {
    code: `NCC-SMOKE-${RUN}`,
    name: "Công ty TNHH Phụ Tùng Smoke",
    taxCode: "0312345678",
    phone: "0901234567",
    email: "sales@smoke.vn",
    address: "Số 1 Test, Q1, TP.HCM",
  }),
);
const supList = log("GET  /api/suppliers", await call("GET", "/api/suppliers?size=5"));
log("GET  /api/suppliers/{id}", await call("GET", `/api/suppliers/${sup.id}`));
const supUpd = log(
  "PUT  /api/suppliers/{id}",
  await call("PUT", `/api/suppliers/${sup.id}`, {
    code: `NCC-SMOKE-${RUN}`,
    name: "Công ty TNHH Phụ Tùng Smoke (đã sửa)",
    phone: "0909999999",
  }),
);

// ── 2. Phụ tùng + tồn kho ───────────────────────────────────────────────────
const cats = log("GET  /api/part-categories", await call("GET", "/api/part-categories?size=5"));
const catId = cats.items[0].id;

const part = log(
  "POST /api/parts",
  await call("POST", "/api/parts", {
    categoryId: catId,
    sku: `SP-SMOKE-${RUN}`,
    name: "Lọc gió Smoke",
    brand: "Smoke",
    unit: "cái",
    sellingPrice: 250000,
    minStockLevel: 5,
    isActive: true,
  }),
);
const partUpd = log(
  "PUT  /api/parts/{id}",
  await call("PUT", `/api/parts/${part.id}`, {
    categoryId: catId,
    sku: `SP-SMOKE-${RUN}`,
    name: "Lọc gió Smoke v2",
    unit: "cái",
    sellingPrice: 260000,
    minStockLevel: 3,
    isActive: true,
  }),
);
log("GET  /api/parts?lowStockOnly", await call("GET", "/api/parts?lowStockOnly=true&size=5"));
const avail = log(
  "POST /api/parts/check-availability",
  await call("POST", "/api/parts/check-availability", {
    items: [{ partId: part.id, quantity: 2 }],
  }),
);
const price = log(
  "POST /api/parts/pricing",
  await call("POST", "/api/parts/pricing", {
    items: [{ partId: part.id, quantity: 2 }],
  }),
);
console.log("     availability:", JSON.stringify(avail));
console.log("     pricing     :", JSON.stringify(price));

// ── 3. Đơn nhập hàng ────────────────────────────────────────────────────────
const po = log(
  "POST /api/purchase-orders",
  await call("POST", "/api/purchase-orders", {
    supplierId: sup.id,
    note: "Đơn smoke test",
    items: [{ partId: part.id, quantity: 10, importPrice: 180000 }],
  }),
);
console.log("     PO:", po.code, po.status, po.totalAmount);
log("GET  /api/purchase-orders", await call("GET", "/api/purchase-orders?size=5"));
const poUpd = log(
  "PUT  /api/purchase-orders/{id}",
  await call("PUT", `/api/purchase-orders/${po.id}`, {
    code: po.code,
    supplierId: sup.id,
    note: "Đơn smoke test (đã sửa)",
    items: [{ partId: part.id, quantity: 12, importPrice: 175000 }],
  }),
);
console.log("     PO sau khi sửa:", poUpd.totalAmount, "items:", poUpd.items.length);
const poApproved = log(
  "POST /api/purchase-orders/{id}/approve",
  await call("POST", `/api/purchase-orders/${po.id}/approve`),
);
console.log("     PO status:", poApproved.status);
const poReceived = log(
  "POST /api/purchase-orders/{id}/complete",
  await call("POST", `/api/purchase-orders/${po.id}/complete`),
);
console.log("     PO status:", poReceived.status, "receivedAt:", poReceived.receivedAt);

// Tồn kho sau khi nhập
const partAfter = log("GET  /api/parts/{id} (sau nhập kho)", await call("GET", `/api/parts/${part.id}`));
console.log(
  "     onHand=",
  partAfter.onHandStock,
  "reserved=",
  partAfter.reservedStock,
  "available=",
  partAfter.availableStock,
  "costPrice=",
  partAfter.costPrice,
);

// ── 4. Sổ kho ───────────────────────────────────────────────────────────────
const tx = log("GET  /api/inventory-transactions", await call("GET", "/api/inventory-transactions?size=5"));
console.log("     tx:", tx.items.map((t) => `${t.type}/${t.partSku}/${t.quantity}`).join(", "));
log(
  "GET  /api/inventory-transactions?type=IMPORT",
  await call("GET", "/api/inventory-transactions?type=IMPORT&size=5"),
);

// ── 5. Kiểm tra chuyển trạng thái bị chặn ───────────────────────────────────
// Tạo đơn nháp rồi huỷ — hợp lệ.
const poCancel = log(
  "POST /api/purchase-orders (đơn để huỷ)",
  await call("POST", "/api/purchase-orders", {
    supplierId: sup.id,
    note: "Đơn để thử huỷ",
    items: [{ partId: part.id, quantity: 1, importPrice: 100000 }],
  }),
);
log(
  "POST /api/purchase-orders/{id}/cancel",
  await call("POST", `/api/purchase-orders/${poCancel.id}/cancel`),
);
// Huỷ đơn đã nhập kho — phải bị backend từ chối.
const cancelReceived = await call(
  "POST",
  `/api/purchase-orders/${po.id}/cancel`,
);
const blocked = cancelReceived.status === 400;
console.log(
  `${blocked ? "OK  " : "FAIL"} POST cancel đơn RECEIVED bị chặn -> ${cancelReceived.status}`,
);
if (!blocked) console.log("     ", JSON.stringify(cancelReceived.json).slice(0, 200));

// ── 6. Dọn dẹp ─────────────────────────────────────────────────────────────
// Đơn đã nhập kho (RECEIVED) thì không huỷ được — backend chỉ cho huỷ ở
// DRAFT/APPROVED. Vì vậy dọn bằng cách ẩn các bản ghi đã tạo.
log("DELETE /api/parts/{id} (ẩn phụ tùng)", await call("DELETE", `/api/parts/${part.id}`));
// NCC đã có đơn nhập hàng thì backend KHÔNG cho xoá cứng (4403) — phải tắt
// hoạt động bằng `isActive=false`.
log(
  "PUT  /api/suppliers/{id} (tắt hoạt động)",
  await call("PUT", `/api/suppliers/${sup.id}`, {
    code: `NCC-SMOKE-${RUN}`,
    name: supUpd.name,
    phone: supUpd.phone,
    isActive: false,
  }),
);

console.log("\nHoàn tất.");
