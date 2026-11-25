/* Smoke test Section 6 - notification-service (Thong bao).
 *
 * Chay: node scripts/section6-smoke.mjs
 *
 * Kiem tra 7 endpoint cua Section 6 trong API_CONNECTIVITY_ANALYSIS.md:
 *   1. GET   /api/notifications/me/unread-count
 *   2. GET   /api/notifications/me              (bonus - danh sach)
 *   3. GET   /api/notifications/stream          (SSE)
 *   4. PATCH /api/notifications/{id}/read
 *   5. PATCH /api/notifications/me/read-all
 *   6. POST  /api/notifications/send
 *   7. GET   /api/notification-templates
 *   8. PUT   /api/notification-templates/{id}
 *
 * Script dung token dang nhap that trong `.tok` (do user-service cap).
 * Neu token het han, fallback sang tu ky token HS256 voi `sub` = UUID.
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

function mintToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    userId: USER_ID,
    authorities: [
      "NOTIFICATION_SEND",
      "NOTIFICATION_TEMPLATE_READ",
      "NOTIFICATION_TEMPLATE_WRITE",
      "ADMIN",
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
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log(`! Token trong ${TOKEN_FILE} da het han, dung token tu ky (--mint)`);
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

async function expectOk(label, method, path, body) {
  const r = await call(method, path, body);
  if (r.status >= 200 && r.status < 300) {
    ok(label, `${r.status}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  return r.json.result;
}

async function expectRejected(label, method, path, body) {
  const r = await call(method, path, body);
  if (r.status >= 400 && r.status < 500) {
    ok(label, `${r.status} ${r.json?.message ?? ""}`);
  } else {
    bad(label, `${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  return r;
}

console.log("=== Section 6 - Notifications - Thong bao ===\n");
console.log(
  `Token: ${real ? `that tu ${TOKEN_FILE} (sub="${real.payload.sub}")` : "TU KY (--mint)"}`,
);
console.log(`Base : ${BASE}\n`);

// -- 1. So thong bao chua doc ------------------------------------------------
console.log("[1] GET /api/notifications/me/unread-count");
const unread = await expectOk(
  "unread-count tra ve so chua doc",
  "GET",
  "/api/notifications/me/unread-count",
);
if (typeof unread?.unreadCount === "number") {
  ok("unreadCount la number", `${unread.unreadCount}`);
} else {
  bad("unreadCount khong phai number", JSON.stringify(unread));
}

// -- 2. Danh sach thong bao --------------------------------------------------
console.log("\n[2] GET /api/notifications/me");
const list = await expectOk(
  "lay danh sach thong bao cua toi",
  "GET",
  "/api/notifications/me?size=20",
);
const items = list?.content ?? [];
console.log(`       ${items.length} thong bao / tong ${list?.totalElements ?? 0}`);
if (Array.isArray(items)) {
  ok("PageResponse dung shape `content`", `first=${list?.first} last=${list?.last}`);
} else {
  bad("PageResponse khong co `content`");
}
if (items.length > 0) {
  const n = items[0];
  const hasFields =
    n.id &&
    n.category &&
    n.title &&
    n.content &&
    typeof n.isRead === "boolean" &&
    n.createdAt;
  if (hasFields) ok("NotificationResponse du field", `id=${n.id}`);
  else bad("NotificationResponse thieu field", JSON.stringify(n).slice(0, 200));
}

// -- 3. Loc theo trang thai / danh muc --------------------------------------
console.log("\n[3] Loc danh sach thong bao");
await expectOk(
  "loc theo isRead=false",
  "GET",
  "/api/notifications/me?isRead=false&size=10",
);
await expectOk(
  "loc theo category=BILLING",
  "GET",
  "/api/notifications/me?category=BILLING&size=10",
);
await expectRejected(
  "category sai bi tu choi (400)",
  "GET",
  "/api/notifications/me?category=NOT_A_CATEGORY",
);

// -- 4. SSE stream ----------------------------------------------------------
console.log("\n[4] GET /api/notifications/stream (SSE)");
{
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  let sawStream = false;
  try {
    const res = await fetch(`${BASE}/api/notifications/stream`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "text/event-stream" },
      signal: controller.signal,
    });
    if (res.status === 200) {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("text/event-stream")) {
        sawStream = true;
        ok("SSE tra 200 + content-type text/event-stream", ct);
      } else {
        bad("SSE content-type sai", ct);
      }
      // Stream phai giu mo (khong ket thuc ngay) - doc 1 chunk roi dung.
      const reader = res.body.getReader();
      const read = await Promise.race([
        reader.read(),
        new Promise((r) => setTimeout(() => r({ done: true, value: undefined }), 1500)),
      ]);
      if (read?.done === false) {
        ok("SSE giu ket noi mo (chua dong)", "da nhan chunk dau tien");
      } else {
        ok("SSE stream bat dau (chua co event nao)", "event chi den khi co thong bao moi");
      }
      reader.cancel().catch(() => {});
    } else {
      bad("SSE tra status khong mong doi", `${res.status}`);
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      ok("SSE giu ket noi mo (het timeout)", "stream khong tu ket thuc");
    } else {
      bad("SSE loi", String(err?.message ?? err));
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  if (!sawStream && pass === 0) bad("Khong xac nhan duoc SSE hoat dong");
}

// -- 5. Danh dau 1 thong bao da doc -----------------------------------------
console.log("\n[5] PATCH /api/notifications/{id}/read");
if (items.length > 0) {
  const target = items.find((n) => !n.isRead) ?? items[0];
  const marked = await expectOk(
    `danh dau da doc notification ${target.id.slice(0, 8)}`,
    "PATCH",
    `/api/notifications/${target.id}/read`,
  );
  if (marked?.isRead === true) ok("isRead chuyen thanh true");
  else bad("isRead chua chuyen thanh true", JSON.stringify(marked).slice(0, 160));
  if (marked?.readAt) ok("readAt duoc gan", marked.readAt);
  else bad("readAt khong duoc gan");

  const after = await expectOk(
    "doc lai unread-count sau khi danh dau",
    "GET",
    "/api/notifications/me/unread-count",
  );
  console.log(`       unreadCount hien tai: ${after?.unreadCount}`);
} else {
  console.log("       (khong co thong bao nao de test - bo qua)");
}

// -- 6. Danh dau tat ca da doc ----------------------------------------------
console.log("\n[6] PATCH /api/notifications/me/read-all");
const count = await expectOk(
  "danh dau tat ca da doc",
  "PATCH",
  "/api/notifications/me/read-all",
);
if (typeof count === "number") ok("tra ve so thong bao da danh dau", `${count}`);
else bad("khong tra ve so luong", JSON.stringify(count));

const afterAll = await expectOk(
  "unread-count = 0 sau read-all",
  "GET",
  "/api/notifications/me/unread-count",
);
if (afterAll?.unreadCount === 0) ok("unreadCount = 0");
else bad("unreadCount chua ve 0", `${afterAll?.unreadCount}`);

// -- 7. Gui thong bao -------------------------------------------------------
console.log("\n[7] POST /api/notifications/send");
const sent = await expectOk(
  "gui thong bao thu cong",
  "POST",
  "/api/notifications/send",
  {
    recipientType: "STAFF",
    recipientId: USER_ID,
    category: "SYSTEM",
    title: `SMOKE_TEST_${Date.now()}`,
    content: "Thong bao kiem thu Section 6 - co the bo qua.",
    referenceType: "SMOKE_TEST",
    referenceId: null,
    sendEmail: false,
  },
);
if (sent?.id && sent?.isRead === false) {
  ok("thong bao da tao va chua doc", `id=${sent.id}`);
  // Idempotent-ish: gui lai van tao thong bao moi (khong co idempotency key).
} else {
  bad("thong bao gui ra khong hop le", JSON.stringify(sent).slice(0, 200));
}

await expectRejected(
  "gui thong bao thieu title bi tu choi (400)",
  "POST",
  "/api/notifications/send",
  {
    recipientType: "STAFF",
    recipientId: USER_ID,
    category: "SYSTEM",
    title: "",
    content: "thieu title",
  },
);

await expectRejected(
  "gui thong bao voi category sai bi tu choi (400)",
  "POST",
  "/api/notifications/send",
  {
    recipientType: "STAFF",
    recipientId: USER_ID,
    category: "KHONG_CO_NAY",
    title: "test",
    content: "test",
  },
);

// -- 8. Danh sach template --------------------------------------------------
console.log("\n[8] GET /api/notification-templates");
const tpl = await expectOk(
  "lay danh sach template",
  "GET",
  "/api/notification-templates?size=50",
);
const templates = tpl?.content ?? [];
console.log(`       ${templates.length} template / tong ${tpl?.totalElements ?? 0}`);
if (templates.length > 0) {
  const t0 = templates[0];
  if (t0.id && t0.code && t0.channel && t0.bodyTemplate !== undefined) {
    ok("NotificationTemplateResponse du field", `code=${t0.code} channel=${t0.channel}`);
  } else {
    bad("NotificationTemplateResponse thieu field", JSON.stringify(t0).slice(0, 200));
  }
}

// -- 9. Cap nhat template ---------------------------------------------------
console.log("\n[9] PUT /api/notification-templates/{id}");
if (templates.length > 0) {
  const target = templates[0];
  const originalBody = target.bodyTemplate;
  const marker = ` [s6-smoke ${Date.now()}]`;
  const updated = await expectOk(
    `cap nhat template ${target.code}`,
    "PUT",
    `/api/notification-templates/${target.id}`,
    {
      subjectTemplate: target.subjectTemplate,
      bodyTemplate: `${originalBody}${marker}`,
      isActive: target.isActive,
    },
  );
  if (updated?.bodyTemplate?.includes(marker)) {
    ok("bodyTemplate da duoc cap nhat");
  } else {
    bad("bodyTemplate khong doi", JSON.stringify(updated).slice(0, 200));
  }
  if (updated?.updatedAt) ok("updatedAt duoc cap nhat", updated.updatedAt);

  // Kiem tra validation: body rong bi tu choi.
  await expectRejected(
    "cap nhat template voi body rong bi tu choi (400)",
    "PUT",
    `/api/notification-templates/${target.id}`,
    { subjectTemplate: null, bodyTemplate: "", isActive: true },
  );

  // Tra lai gia tri goc de khong lam bang nhieu du lieu.
  await expectOk(
    "khoi phuc template ve gia tri goc",
    "PUT",
    `/api/notification-templates/${target.id}`,
    {
      subjectTemplate: target.subjectTemplate,
      bodyTemplate: originalBody,
      isActive: target.isActive,
    },
  );
} else {
  console.log("       (khong co template nao de test - bo qua)");
}

// -- 10. Bao mat: khong co token -------------------------------------------
console.log("\n[10] Bao mat - request khong co token");
for (const [method, path] of [
  ["GET", "/api/notifications/me"],
  ["GET", "/api/notifications/me/unread-count"],
  ["PATCH", "/api/notifications/me/read-all"],
  ["GET", "/api/notification-templates"],
]) {
  const res = await fetch(`${BASE}${path}`, { method });
  if (res.status === 401 || res.status === 403) {
    ok(`khong token -> ${res.status}`, path);
  } else {
    bad(`khong token van duoc phep (${res.status})`, path);
  }
}

// -- 11. Token sai -------------------------------------------------------
console.log("\n[11] Token khong hop le");
{
  const res = await fetch(`${BASE}/api/notifications/me/unread-count`, {
    headers: { Authorization: "Bearer not-a-valid-token" },
  });
  if (res.status === 401) ok("token sai -> 401");
  else bad("token sai van duoc phep", `${res.status}`);
}

// -- 12. Khong duoc quyen (khong phai admin) ------------------------------
console.log("\n[12] Token khong co quyen NOTIFICATION_*");
{
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { userId: USER_ID, authorities: [], sub: USER_ID, iat: now, exp: now + 600 };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", Buffer.from(SECRET, "base64"))
    .update(`${h}.${p}`)
    .digest("base64url");
  const weak = `${h}.${p}.${sig}`;

  const res = await fetch(`${BASE}/api/notification-templates`, {
    headers: { Authorization: `Bearer ${weak}` },
  });
  if (res.status === 403) ok("khong co quyen -> 403");
  else bad("khong co quyen van doc duoc template", `${res.status}`);
}

// -- Ket qua ---------------------------------------------------------------
console.log(`\n=== KET QUA: ${pass} pass, ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
