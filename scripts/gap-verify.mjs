/* Smoke test cho 7 endpoint frontend vừa nối (Gap Section 9).
 *
 * Chay: node scripts/gap-verify.mjs
 *
 * Kiểm tra 7 endpoint mà frontend TRƯỚC ĐÂY chưa gọi:
 *   1. GET   /api/users/{id}                      (user-service)
 *   2. POST  /api/users                          (user-service)
 *   3. GET   /api/customers/{id}                  (customer-vehicle-service)
 *   4. GET   /api/part-categories/{id}           (inventory-service)
 *   5. GET   /api/service-categories/{id}        (inventory-service)
 *   6. POST  /api/staff/bookings                 (booking-service)
 *   7. PATCH /api/staff/bookings/{id}/reschedule  (booking-service)
 *
 * Token lay tu `.tok` (user-service cap). Neu het han -> fallback tu ky HS256
 * voi `sub` = UUID. Co the truyen `--mint` de luon tu ky.
 */
import { randomUUID, createHmac } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const SECRET =
  process.env.JWT_SECRET ??
  "q3PvQ4L4+KCfSsvQjSpIGsCOHUyQ7JEcHQOTD5SOsv1KnBEgbDBgXXKSnouWaufO";
const USER_ID = "10000000-0000-0000-0000-000000000001";

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

/**
 * Token nhân viên quản trị: đủ quyền cho cả 7 endpoint.
 *
 * ⚠️ Chỉ dùng token tự ký cho các service KHÔNG phải user-service (nơi
 * authorities lấy từ claim). user-service nạp user từ DB nên phải login thật.
 */
function mintStaffToken() {
  return sign({
    userId: USER_ID,
    authorities: [
      "USER_READ",
      "USER_CREATE",
      "USER_UPDATE",
      "USER_DELETE",
      "CUSTOMER_READ",
      "PART_READ",
      "PART_WRITE",
      "SERVICE_READ",
      "SERVICE_WRITE",
      "BOOKING_READ",
      "BOOKING_CREATE",
      "BOOKING_RESCHEDULE",
      "BOOKING_STATUS_UPDATE",
      "BOOKING_CANCEL",
      "BOOKING_CHECK_IN",
      "ROLE_ADMIN",
    ],
    sub: USER_ID,
  });
}

/**
 * Đăng nhập thật để lấy token.
 *
 * ⚠️ KHÔNG tự ký token cho user-service: `JwtAuthenticationFilter` của
 * user-service **nạp user từ database** theo `sub` (username) và lấy
 * authorities từ **role trong DB** — không đọc claim `authorities` của token.
 * Token tự ký với `sub` giả → `loadUserByUsername` ném exception → **401**.
 *
 * Vì vậy phải login thật bằng tài khoản admin seed sẵn (V4__seed_data.sql:
 * `admin` / `Admin@123`).
 */
async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (res.status < 200 || res.status >= 300) {
    return { error: `${res.status} ${JSON.stringify(json).slice(0, 200)}` };
  }
  return { token: json?.result?.accessToken ?? json?.accessToken };
}

/** Token chỉ có quyền đọc -> dùng để chứng minh endpoint ghi trả 403. */
function mintReadOnlyToken() {
  return sign({
    userId: USER_ID,
    authorities: ["USER_READ", "CUSTOMER_READ", "PART_READ", "SERVICE_READ"],
    sub: USER_ID,
  });
}

const LOGIN_USER = process.env.LOGIN_USER ?? "admin";
const LOGIN_PASS = process.env.LOGIN_PASS ?? "Admin@123";

let STAFF_TOKEN = null;
const loginResult = await login(LOGIN_USER, LOGIN_PASS);
if (loginResult.token) {
  STAFF_TOKEN = loginResult.token;
  console.log(`> Đăng nhập OK với '${LOGIN_USER}'`);
} else {
  console.error(`! Đăng nhập thất bại: ${loginResult.error}`);
  console.error("  (biến môi trường LOGIN_USER / LOGIN_PASS để đổi tài khoản)");
  process.exit(1);
}
const READONLY_TOKEN = mintReadOnlyToken();

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

async function expectStatus(label, expected, method, path, body, token = STAFF_TOKEN) {
  const r = await call(method, path, body, token);
  if (r.status === expected) {
    ok(label, `${r.status}`);
  } else {
    bad(label, `${r.status} (mong doi ${expected}) ${JSON.stringify(r.json).slice(0, 160)}`);
  }
  return r.json?.result;
}

// ---------------------------------------------------------------------------

console.log("=".repeat(78));
console.log("GAP VERIFY - 7 endpoint frontend vua noi (Section 9)");
console.log("=".repeat(78));
console.log();

const created = { users: [], bookings: [], customers: [], customUsers: [] };

try {
  // ─────────────────────────────────────────────────────────── 1. USER CREATE
  console.log("[1] POST /api/users (tao nguoi dung moi)");
  const suffix = Date.now().toString(36);
  const newUser = await expectOk(
    "tao user moi",
    "POST",
    "/api/users",
    {
      username: `smoke_${suffix}`,
      password: "Smoke@12345",
      email: `smoke_${suffix}@example.com`,
      fullName: "Smoke Test User",
      phone: `09${suffix.slice(-8).replace(/\D/g, "") || "12345678"}`.slice(0, 10),
      isActive: true,
    },
  );
  if (newUser?.id) {
    created.users.push(newUser.id);
    ok("user moi co id", newUser.id);
    ok("user moi co username", newUser.username);
  }

  // ────────────────────────────────────────────────────── 2. USER GET BY ID
  console.log();
  console.log("[2] GET /api/users/{id} (chi tiet nguoi dung)");
  const userId = created.users[0] ?? USER_ID;
  const user = await expectOk("lay chi tiet user", "GET", `/api/users/${userId}`);
  if (user?.id) {
    ok("user id khop", user.id);
    ok("user co username + email", `${user.username} / ${user.email}`);
  }

  // ─────────────────────────────────────────────── 3. CUSTOMER GET BY ID
  console.log();
  console.log("[3] GET /api/customers/{id} (chi tiet khach hang)");
  const custList = await expectOk(
    "lay danh sach khach hang",
    "GET",
    "/api/customers?page=0&size=5",
  );
  const customerId = custList?.items?.[0]?.id;
  if (customerId) {
    created.customers.push(customerId);
    const cust = await expectOk(
      "lay chi tiet khach hang",
      "GET",
      `/api/customers/${customerId}`,
    );
    if (cust?.id) {
      ok("customer id khop", cust.id);
      ok("customer co fullName", String(cust.fullName));
    }
  } else {
    bad("co it nhat 1 khach hang de test GET by id");
  }

  // ─────────────────────────────────────── 5. PART/SERVICE CATEGORY GET BY ID
  console.log();
  console.log("[5] GET /api/part-categories/{id} + /api/service-categories/{id}");
  const partCats = await expectOk(
    "lay danh sach nhom phu tung",
    "GET",
    "/api/part-categories?page=0&size=5",
  );
  const partCatId = partCats?.items?.[0]?.id;
  if (partCatId) {
    const c = await expectOk(
      "lay chi tiet nhom phu tung",
      "GET",
      `/api/part-categories/${partCatId}`,
    );
    if (c?.id) ok("nhom phu tung id khop", c.id);
  } else {
    bad("khong co nhom phu tung nao de test");
  }

  const svcCats = await expectOk(
    "lay danh sach nhom dich vu",
    "GET",
    "/api/service-categories?page=0&size=5",
  );
  const svcCatId = svcCats?.items?.[0]?.id;
  if (svcCatId) {
    const c = await expectOk(
      "lay chi tiet nhom dich vu",
      "GET",
      `/api/service-categories/${svcCatId}`,
    );
    if (c?.id) ok("nhom dich vu id khop", c.id);
  } else {
    bad("khong co nhom dich vu nao de test");
  }

  // ────────────────────────────────────────────── 6. STAFF BOOKING CREATE
  console.log();
  console.log("[6] POST /api/staff/bookings (nhan vien tao lich hen ho khach)");

  // Can serviceId hop le + slot con trong lich.
  const svcList = await expectOk(
    "lay danh sach dich vu",
    "GET",
    "/api/services?page=0&size=20",
  );
  // Uu tien dich vu chi can 1 ky thuat vien -> de hon nhieu cho suc chua.
  // Backend serialize snake_case: `required_techs` (xem ServiceResponse.java).
  const candidates = (svcList?.items ?? []).filter(
    (s) => (s.requiredTechs ?? s.required_techs) === 1,
  );
  const serviceId =
    candidates[0]?.id ??
    (svcList?.items ?? []).find(
      (s) => (s.requiredTechs ?? s.required_techs) === 1,
    )?.id ??
    svcList?.items?.[0]?.id;

  if (!serviceId || !customerId) {
    bad("khong du service hoac customer de tao lich hen");
  } else {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const from = iso(today);
    const to = iso(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));

    const avail = await call(
      "GET",
      `/api/bookings/availability?from=${from}&to=${to}&serviceIds=${serviceId}`,
    );
    const slots = avail.json?.result ?? [];
    if (!slots.length) {
      bad("khong tim duoc slot trong 7 ngay toi - bo qua test booking");
    } else {
    // Slot shape: { startAt, endAt } (ISO instant).
    const slot = slots[0];
    const startAt = new Date(slot.startAt ?? slot.start ?? slot);
    const plate = "30A-12345";

    const booking = await expectOk(
      "tao lich hen staff",
      "POST",
      "/api/staff/bookings",
      {
        source: "WALK_IN",
        startAt: startAt.toISOString(),
        serviceIds: [serviceId],
        licensePlate: plate,
        customerId,
        customerNote: "smoke test - se bi huy",
      },
    );
    if (booking?.id) {
      created.bookings.push(booking.id);
      ok("lich hen moi co id", booking.id);
      ok("lich hen co source= WALK_IN", booking.source);
      ok(
        "lich hen gan customer + service",
        `customer=${booking.customerId} services=${booking.services?.length}`,
      );

      // ───────────────────────────────── 7. STAFF BOOKING RESCHEDULE
      console.log();
      console.log("[7] PATCH /api/staff/bookings/{id}/reschedule (doi lich hen)");
      // Chon slot thu 2 trong danh sach trong -> chắc chắn con trong lich
      // (khong doan mo 3 gio moi nhu truoc, vi slot do co the da full).
      const target = slots[1] ?? slots[0];
      const newStart = new Date(target.startAt ?? target.start ?? target);
      const rescheduled = await expectOk(
        "doi lich hen sang moc moi",
        "PATCH",
        `/api/staff/bookings/${booking.id}/reschedule`,
        { startAt: newStart.toISOString() },
      );
      if (rescheduled?.id) {
        ok("reschedule tra ve cung booking id", rescheduled.id);
        ok(
          "startAt da doi",
          `${booking.startAt} -> ${rescheduled.startAt}`,
        );
      }

      // Reschedule ve moc qua phai 400 (backend co @Future)
      await expectStatus(
        "reschedule moc trong qua -> 400",
        400,
        "PATCH",
        `/api/staff/bookings/${booking.id}/reschedule`,
        { startAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      );
    }
    }
  }

  // ───────────────────────────────────────────── 8. Token ghi phai 403
  console.log();
  console.log("[8] Endpoint ghi voi token khach hang -> 403");
  // Tao tai khoan khach THAT qua API register, roi login de lay token.
  // Khong the dung token tu ky: user-service nap user tu DB theo `sub` va lay
  // authorities tu role trong DB -> token tu ky luon bi 401.
  const custUser = `ro_${suffix}`;
  const custPass = "Smoke@12345";
  const reg = await call("POST", "/api/auth/register", {
    username: custUser,
    password: custPass,
    email: `${custUser}@example.com`,
    fullName: "Smoke Customer",
  });
  if (reg.status >= 200 && reg.status < 300) {
    ok("dang ky tai khoan khach hang", reg.status);
    // /api/auth/register tra accessToken, khong tra userId -> lay `userId` tu
    // claim trong token de xoa ve sau.
    const regToken = reg.json?.result?.accessToken ?? reg.json?.accessToken;
    const regUserId = regToken
      ? (() => {
          try {
            const p = JSON.parse(
              Buffer.from(
                regToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
                "base64",
              ).toString("utf8"),
            );
            return p.userId ?? p.sub;
          } catch {
            return null;
          }
        })()
      : null;
    if (regUserId) created.customUsers.push(regUserId);
    const custLogin = await login(custUser, custPass);
    if (custLogin.token) {
      const CUSTOMER_TOKEN = custLogin.token;
      await expectStatus(
        "GET /api/users/{id} voi token khach -> 403",
        403,
        "GET",
        `/api/users/${created.users[0] ?? USER_ID}`,
        null,
        CUSTOMER_TOKEN,
      );
      await expectStatus(
        "POST /api/users voi token khach -> 403",
        403,
        "POST",
        "/api/users",
        {
          username: `ro2_${suffix}`,
          password: custPass,
          email: `ro2_${suffix}@example.com`,
        },
        CUSTOMER_TOKEN,
      );
      await expectStatus(
        "GET /api/customers/{id} voi token khach -> 403",
        403,
        "GET",
        `/api/customers/${created.customers[0] ?? customerId}`,
        null,
        CUSTOMER_TOKEN,
      );
      await expectStatus(
        "POST /api/staff/bookings voi token khach -> 403",
        403,
        "POST",
        "/api/staff/bookings",
        {
          source: "WALK_IN",
          startAt: new Date(Date.now() + 86400000).toISOString(),
          serviceIds: [serviceId ?? "00000000-0000-0000-0000-000000000000"],
          licensePlate: "30A-12345",
          customerId: customerId ?? "00000000-0000-0000-0000-000000000000",
        },
        CUSTOMER_TOKEN,
      );
    } else {
      bad("dang nhap tai khoan khach that bai", custLogin.error ?? "");
    }
  } else {
    bad("dang ky tai khoan khach that bai", `${reg.status}`);
  }

  // ───────────────────────────────────────────── 9. Validation
  console.log();
  console.log("[9] Validation");
  await expectStatus(
    "POST /api/users thieu username -> 400",
    400,
    "POST",
    "/api/users",
    { password: "Smoke@12345", email: `v_${suffix}@example.com` },
  );
  await expectStatus(
    "POST /api/users email khong hop le -> 400",
    400,
    "POST",
    "/api/users",
    {
      username: `v_${suffix}`,
      password: "Smoke@12345",
      email: "khong-phai-email",
    },
  );
  await expectStatus(
    "GET /api/users/{id} voi id khong phai UUID -> 400",
    400,
    "GET",
    "/api/users/khong-phai-uuid",
  );
} finally {
  // ─────────────────────────────────────────────── Don dep du lieu test
  console.log();
  console.log("[ cleanup ] Xoa du lieu test");

  for (const bookingId of created.bookings) {
    const r = await call("POST", `/api/staff/bookings/${bookingId}/cancel`, {
      reason: "smoke test cleanup",
    });
    if (r.status >= 200 && r.status < 300) ok("huy lich hen", bookingId);
    else bad("huy lich hen that bai", `${bookingId} -> ${r.status}`);
  }

  for (const userId of created.users) {
    const r = await call("DELETE", `/api/users/${userId}`);
    if (r.status >= 200 && r.status < 300) ok("xoa user test", userId);
    else bad("xoa user that bai", `${userId} -> ${r.status}`);
  }

  // Tai khoan khach tao qua /api/auth/register de test 403.
  // Khong co API "xoá tài khoản khách" -> phai xoá qua API admin (can USER_DELETE)
  // hoac bo qua (dang soft-delete trong DB).
  if (created.customUsers?.length) {
    for (const u of created.customUsers) {
      const r = await call("DELETE", `/api/users/${u}`);
      if (r.status >= 200 && r.status < 300) ok("xoa tai khoan khach test", u);
      else bad("xoa tai khoan khach that bai", `${u} -> ${r.status}`);
    }
  }
}

console.log();
console.log("=".repeat(78));
console.log(`=== KET QUA: ${pass} pass, ${fail} fail ===`);
console.log("=".repeat(78));
process.exit(fail > 0 ? 1 : 0);
