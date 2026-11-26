// Tạo tài khoản khách hàng test + dữ liệu thật cho tab "Xe của tôi".
// Chạy: node scripts/seed-demo-customer.mjs
const BASE = "http://localhost:8000";
const USER = "demo01";
const PASS = "Demo@123456";
const PHONE = "0900000001";

async function main() {
  // 1. Đăng ký tài khoản
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: USER,
      password: PASS,
      email: `${USER}@example.com`,
      phone: PHONE,
      fullName: "Nguyễn Văn Demo",
    }),
  }).then((r) => r.json());
  console.log("[1] dang ky ->", reg.code, reg.message);

  // 2. Admin tạo xe + lịch sử bảo dưỡng
  const adminLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Admin@123" }),
  }).then((r) => r.json());
  const adminToken = adminLogin.result?.accessToken;
  if (!adminToken) throw new Error("admin login fail");
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  console.log("[2] admin login OK");

  // 3. Lấy customerId của khách
  const custLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASS }),
  }).then((r) => r.json());
  const custToken = custLogin.result?.accessToken;
  const me = await fetch(`${BASE}/api/customers/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  }).then((r) => r.json());
  const customerId = me.result?.id;
  console.log("[3] customerId ->", customerId, "| code:", me.code);

  // 4. Tạo 2 xe
  const vehicles = [];
  for (const v of [
    { licensePlate: "30A-111.11", make: "Toyota", model: "Vios 1.5G", modelYear: 2023, odometerKm: 18500 },
    { licensePlate: "30A-222.22", make: "Kia", model: "Morning 1.25 AT", modelYear: 2021, odometerKm: 55000 },
  ]) {
    const created = await fetch(`${BASE}/api/vehicles`, {
      method: "POST",
      headers: { ...adminAuth, "Content-Type": "application/json" },
      body: JSON.stringify(v),
    }).then((r) => r.json());
    console.log(`[4] tao xe ${v.licensePlate} ->`, created.code);
    if (created.result?.id) vehicles.push({ ...v, id: created.result.id });
  }

  // 5. Lich su bao duong: xe 1 co 2 lan, xe 2 co 1 lan
  const histories = [
    { vi: 0, odo: 15000, date: "2026-09-15T09:00:00Z", summary: "Thay dau + loc gio" },
    { vi: 0, odo: 18500, date: "2026-11-20T10:30:00Z", summary: "Bao duong dinh ky 40.000km" },
    { vi: 1, odo: 55000, date: "2026-10-05T14:00:00Z", summary: "Thay may phanh truoc" },
  ];
  for (const h of histories) {
    const res = await fetch(
      `${BASE}/api/vehicles/${vehicles[h.vi].id}/service-history`,
      {
        method: "POST",
        headers: { ...adminAuth, "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          recordType: "CUSTOMER_REPORTED",
          serviceDate: h.date,
          odometerKm: h.odo,
          summary: h.summary,
          description: "Ghi nhan tai xuong AutoCare",
          garageName: "AutoCare Workshop",
        }),
      },
    ).then((r) => r.json());
    console.log(`[5] lich su "${h.summary}" ->`, res.code);
  }

  // 6. Kiem chung
  const mine = await fetch(`${BASE}/api/service-history/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  }).then((r) => r.json());
  const items = mine.result?.items ?? [];
  console.log(`[6] GET /api/service-history/me -> ${items.length} ban ghi, ${new Set(items.map((i) => i.vehicleId)).size} xe`);

  console.log("\n=== TAI KHOAN TEST ===");
  console.log(`username: ${USER}`);
  console.log(`password: ${PASS}`);
  console.log(`URL: http://localhost:5173/login`);
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
