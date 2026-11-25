import { readFileSync } from "node:fs";

const token = readFileSync(".tok", "utf8").trim();
const H = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json; charset=utf-8",
};

async function call(method, path, body) {
  const res = await fetch(`http://localhost:8000${path}`, {
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

const SERVICE = "c4dfead7-cf91-4d3b-88e4-2cd0255716f1";
const BOM = "f6508cda-a23f-4ab9-8c01-cfaaca0c2dc4";

console.log("GET  bom      ", JSON.stringify((await call("GET", `/api/services/${SERVICE}/bom`)).json.result));
const upd = await call("PUT", `/api/services/${SERVICE}/bom/${BOM}`, {
  default_quantity: 7,
  note: "ghi chú bom",
});
console.log("PUT  bom      ", upd.status, JSON.stringify(upd.json));
console.log("GET  bom      ", JSON.stringify((await call("GET", `/api/services/${SERVICE}/bom`)).json.result));
const del = await call("DELETE", `/api/services/${SERVICE}/bom/${BOM}`);
console.log("DELETE bom    ", del.status);
console.log("GET  bom      ", JSON.stringify((await call("GET", `/api/services/${SERVICE}/bom`)).json.result));

// ── Nhóm phụ tùng CRUD ─────────────────────────────────────────────────────
const c = await call("POST", "/api/part-categories", {
  code: "SMOKE-CAT",
  name: "Nhóm smoke",
  description: "test",
});
console.log("POST part-cat ", c.status, JSON.stringify(c.json.result));
const catId = c.json.result?.id;
const u = await call("PUT", `/api/part-categories/${catId}`, {
  code: "SMOKE-CAT",
  name: "Nhóm smoke (sửa)",
});
console.log("PUT  part-cat ", u.status, JSON.stringify(u.json.result));
const d = await call("DELETE", `/api/part-categories/${catId}`);
console.log("DEL  part-cat ", d.status, JSON.stringify(d.json));

// ── Nhóm dịch vụ CRUD ───────────────────────────────────────────────────────
const sc = await call("POST", "/api/service-categories", {
  code: "SMOKE-SVC",
  name: "Nhóm dịch vụ smoke",
});
console.log("POST svc-cat  ", sc.status, JSON.stringify(sc.json.result));
const scId = sc.json.result?.id;
const su = await call("PUT", `/api/service-categories/${scId}`, {
  code: "SMOKE-SVC",
  name: "Nhóm dịch vụ smoke (sửa)",
});
console.log("PUT  svc-cat  ", su.status, JSON.stringify(su.json.result));
const sd = await call("DELETE", `/api/service-categories/${scId}`);
console.log("DEL  svc-cat  ", sd.status, JSON.stringify(sd.json));
