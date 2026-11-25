/**
 * Seed thêm danh mục + dịch vụ cho inventory-service (mục đích demo).
 *
 * Hiện DB chỉ có 1 danh mục ("Bảo dưỡng chung") và 2 dịch vụ, khiến phần
 * "Dịch vụ phổ biến" ở trang chủ không kiểm chứng được:
 *  - dải chip danh mục cuộn ngang
 *  - lọc tức thời theo danh mục
 *
 * Script này thêm 4 danh mục + 8 dịch vụ (mỗi danh mục 2 dịch vụ) để demo.
 *
 * Chạy:  node scripts/seed-demo-services.mjs
 * Xoá:   node scripts/seed-demo-services.mjs --rollback
 *
 * Dùng HTTP API của inventory-service (qua api-gateway) nên không cần driver.
 */
const BASE = "http://localhost:8000";
const ADMIN = { username: "admin", password: "Admin@123" };

/**
 * Danh mục demo: [code, name, description].
 *
 * "Bảo dưỡng chung" đã tồn tại sẵn trong DB với code `BERRYCARE` (không phải
 * `BAODUONGCHUNG`) — dùng code đó để không tạo trùng danh mục.
 */
const CATEGORIES = [
  ["BERRYCARE", "Bảo dưỡng chung", "Bảo dưỡng định kỳ theo khuyến cáo nhà sản xuất."],
  ["SUACHUA", "Sửa chữa", "Sửa chữa, khắc phục hư hỏng kỹ thuật bằng linh kiện chính hãng."],
  ["SONTHANVO", "Sơn & thân vỏ", "Sơn, đánh bóng và phục hồi thân vỏ trong phòng sơn kín."],
  ["DIENDIENHOA", "Điện - Điều hòa", "Chăm sóc hệ thống điện, ắc quy và điều hòa."],
  ["LOPPHANH", "Lốp & phanh", "Thay lốp, kiểm tra hệ thống phanh và cân chỉnh độ chụm."],
];

/** Dịch vụ demo: [code, name, categoryCode, duration, techs, price]. */
const SERVICES = [
  ["SVC-OILFILTER", "Thay lọc dầu & vòng quay", "BERRYCARE", 60, 1, 500000],
  ["SVC-COOLANT", "Thay nước làm mát", "SUACHUA", 60, 1, 550000],
  ["SVC-SUSPENSION", "Thay giảm chấn trước", "SUACHUA", 90, 1, 980000],
  ["SVC-AC", "Bảo dưỡng điều hòa", "DIENDIENHOA", 75, 1, 650000],
  ["SVC-BATTERY", "Kiểm tra & thay ắc quy", "DIENDIENHOA", 45, 1, 1200000],
  ["SVC-PAINT", "Sơn phục hồi toàn thân", "SONTHANVO", 480, 3, 6500000],
  ["SVC-POLISH", "Đánh bóng & phục hồi sơn", "SONTHANVO", 120, 1, 1500000],
  ["SVC-BRAKEDISC", "Thay đĩa phanh & má phanh", "LOPPHANH", 120, 2, 1400000],
];

const ROLLBACK = process.argv.includes("--rollback");

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, code: json.code, message: json.message, result: json.result };
}

async function main() {
  // 1. Admin login
  const login = await api("/api/auth/login", {
    method: "POST",
    body: ADMIN,
  });
  const token = login.result?.accessToken;
  if (!token) throw new Error(`admin login fail: ${login.code} ${login.message}`);
  console.log("[1] admin login OK");

  // 2. Danh mục hiện có
  const catsRes = await api("/api/service-categories?size=100", { token });
  const existingCats = catsRes.result?.items ?? catsRes.result?.content ?? [];
  const catIdByCode = new Map(existingCats.map((c) => [c.code, c.id]));
  console.log(`[2] danh muc hien co: ${existingCats.length}`);

  // 3. Tạo danh mục còn thiếu (bỏ qua danh mục đã có sẵn trong DB)
  for (const [code, name, description] of CATEGORIES) {
    if (catIdByCode.has(code)) continue;
    const created = await api("/api/service-categories", {
      method: "POST",
      token,
      body: { code, name, description },
    });
    if (created.result?.id) {
      catIdByCode.set(code, created.result.id);
      console.log(`[3] tao danh muc "${name}" -> OK`);
    } else {
      console.log(`[3] tao danh muc "${name}" -> FAIL ${created.code} ${created.message}`);
    }
  }

  // 4. Dịch vụ hiện có (theo code)
  // Lưu ý: `size` tối đa 100 — dùng 200 sẽ khiến API trả rỗng.
  const svcRes = await api("/api/services?size=100", { token });
  const existingSvcs = svcRes.result?.items ?? svcRes.result?.content ?? [];
  const svcIdByCode = new Map(existingSvcs.map((s) => [s.code, s.id]));
  console.log(`[4] dich vu hien co: ${existingSvcs.length}`);

  // 5. Tạo / xoá dịch vụ demo
  for (const [code, name, catCode, duration, techs, price] of SERVICES) {
    const categoryId = catIdByCode.get(catCode);
    if (!categoryId) {
      console.log(`[5] bo qua "${name}" — khong tim thay danh muc ${catCode}`);
      continue;
    }

    if (ROLLBACK) {
      const id = svcIdByCode.get(code);
      if (!id) continue;
      const del = await api(`/api/services/${id}`, { method: "DELETE", token });
      console.log(`[5] xoa dich vu "${name}" -> ${del.status}`);
      continue;
    }

    const payload = {
      categoryId,
      code,
      name,
      duration_minutes: duration,
      required_techs: techs,
      baseLaborPrice: price,
      isActive: true,
    };
    const existingId = svcIdByCode.get(code);
    const res = existingId
      ? await api(`/api/services/${existingId}`, { method: "PUT", token, body: payload })
      : await api("/api/services", { method: "POST", token, body: payload });
    console.log(`[5] ${existingId ? "cap nhat" : "tao"} dich vu "${name}" -> ${res.status} ${res.code ?? ""}`);
  }

  // 6. Tổng kết
  const finalCats = await api("/api/service-categories?size=100", { token });
  const finalSvcs = await api("/api/services?size=100", { token });
  const fc = finalCats.result?.items ?? finalCats.result?.content ?? [];
  const fs = finalSvcs.result?.items ?? finalSvcs.result?.content ?? [];
  console.log("\nKet qua:");
  for (const c of fc) {
    const count = fs.filter((s) => s.categoryId === c.id).length;
    console.log(`  - ${c.name}: ${count} dich vu`);
  }
}

main().catch((err) => {
  console.error("Seed that bai:", err.message);
  process.exit(1);
});
