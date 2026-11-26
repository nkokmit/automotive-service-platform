/* Dọn dẹp dữ liệu smoke test của Section 3.
 * Chạy: node scripts/section3-cleanup.mjs
 *
 * Xoá các bản ghi test đã tạo: nhà cung cấp (NCC-SMOKE-*, NCC-TEST*),
 * phụ tùng (SP-SMOKE-*) và các đơn nhập hàng ở trạng thái DRAFT/RECEIVED.
 *
 * Lưu ý: backend chặn xoá cứng khi đã có đơn nhập hàng → phải tắt hoạt
 * động (isActive=false) thay vì xoá.
 */
import { readFileSync } from "node:fs";

const token = readFileSync(".tok", "utf8").trim();
const BASE = "http://localhost:8000";
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
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: text };
  }
}

// ── Nhà cung cấp test ───────────────────────────────────────────────────────
// `size` tối đa 100 (backend `@Max(100)`) — phải phân trang.
const sups = await call("GET", "/api/suppliers?size=100&page=0");
for (const s of sups.json.result?.items ?? []) {
  if (!/^NCC-(SMOKE|TEST)/i.test(s.code)) continue;
  const r = await call("PUT", `/api/suppliers/${s.id}`, {
    code: s.code,
    name: s.name,
    taxCode: s.taxCode,
    phone: s.phone,
    email: s.email,
    address: s.address,
    isActive: false,
  });
  console.log(`NCC ${s.code} -> tắt hoạt động (${r.status})`);
}

// ── Phụ tùng test ───────────────────────────────────────────────────────────
const parts = await call("GET", "/api/parts?size=100&page=0");
for (const p of parts.json.result?.items ?? []) {
  if (!/^SP-SMOKE-/i.test(p.sku)) continue;
  const r = await call("DELETE", `/api/parts/${p.id}`);
  console.log(`Part ${p.sku} -> ẩn (${r.status})`);
}

// ── Đơn nhập hàng test (chỉ DRAFT/RECEIVED — huỷ được) ─────────────────────
const pos = await call("GET", "/api/purchase-orders?size=100&page=0");
for (const po of pos.json.result?.items ?? []) {
  if (po.status === "APPROVED") continue;
  if (!/SMOKE/i.test(po.note ?? "")) continue;
  const r = await call("POST", `/api/purchase-orders/${po.id}/cancel`);
  console.log(`PO ${po.code} (${po.status}) -> huỷ (${r.status})`);
}

console.log("\nDọn dẹp xong.");
