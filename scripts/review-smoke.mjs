// Kiểm chứng runtime 3 endpoint đánh giá sửa chữa (work-order-service).
//
// Chạy: node scripts/review-smoke.mjs
//   REVIEW_USER / REVIEW_PASS  — đăng nhập bằng tài khoản thật (mặc định demo01)
//   REVIEW_USER_ID            — bỏ qua login, mint token trực tiếp cho userId này
const BASE = "http://localhost:8000";

const USER = process.env.REVIEW_USER ?? "demo01";
const PASS = process.env.REVIEW_PASS ?? "Demo@123456";

async function mintToken(userId) {
  const { createHmac } = await import("node:crypto");
  const { readFileSync } = await import("node:fs");
  const secret = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("JWT_SECRET="))
    .slice("JWT_SECRET=".length)
    .trim();
  const key = Buffer.from(secret, "base64");
  const b64url = (b) => Buffer.from(b).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ sub: userId, userId, iat: now, exp: now + 3600, authorities: [] }),
  )}`;
  const sig = createHmac("sha256", key).update(input).digest("base64url");
  return `${input}.${sig}`;
}

async function main() {
  // 1. Public summary — KHÔNG token (đúng thiết kế permitAll)
  const anon = await fetch(
    `${BASE}/api/work-orders/reviews/summary?limit=5`,
  ).then((r) => r.json().catch(() => null));
  console.log(
    "[1] summary (khong token) -> code=",
    anon?.code,
    "| avg=",
    anon?.result?.averageRating,
    "| count=",
    anon?.result?.reviewCount,
  );

  // 2. Lấy token khách hàng
  let token;
  if (process.env.REVIEW_USER_ID) {
    token = await mintToken(process.env.REVIEW_USER_ID);
    console.log("[2] minted token for userId", process.env.REVIEW_USER_ID);
  } else {
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: USER, password: PASS }),
    }).then((r) => r.json());
    token = login.result?.accessToken;
    if (!token) throw new Error("login fail: " + JSON.stringify(login));
    console.log("[2] login OK");
  }
  const auth = { Authorization: `Bearer ${token}` };

  // 3. Danh sách phiếu có thể đánh giá
  const eligible = await fetch(
    `${BASE}/api/work-orders/me/feedback-eligible?page=0&size=20`,
    { headers: auth },
  ).then((r) => r.json());
  console.log(
    "[3] feedback-eligible -> code=",
    eligible.code,
    "| items=",
    eligible.result?.items?.length ?? 0,
    "| total=",
    eligible.result?.totalElements,
  );
  for (const item of eligible.result?.items ?? []) {
    console.log("      - ", item.workOrderCode, item.workOrderId);
  }

  // 4. Gửi đánh giá cho phiếu đầu tiên
  const first = eligible.result?.items?.[0];
  if (!first) {
    console.log("[4] khong co phieu nao de danh gia — bo qua");
    return;
  }
  const submit = await fetch(
    `${BASE}/api/work-orders/${first.workOrderId}/feedback`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "Dich vu rat tot, ky thuat vien nhanh nhuan." }),
    },
  ).then((r) => r.json());
  console.log(
    "[4] submit feedback -> code=",
    submit.code,
    "| rating=",
    submit.result?.rating,
    "| comment=",
    submit.result?.comment,
  );

  // 5. Đánh giá lần 2 cùng phiếu → phải bị chặn 409 / code 6003
  const again = await fetch(
    `${BASE}/api/work-orders/${first.workOrderId}/feedback`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 3, comment: "Lan hai" }),
    },
  ).then((r) => r.json());
  console.log("[5] submit lan hai -> code=", again.code, "| msg=", again.message);

  // 6. Rating ngoài khoảng → phải bị chặn 400
  const bad = await fetch(
    `${BASE}/api/work-orders/${first.workOrderId}/feedback`,
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 9 }),
    },
  ).then((r) => r.json());
  console.log("[6] rating=9 -> code=", bad.code, "| msg=", bad.message);

  // 7. Summary sau khi có đánh giá
  const summary = await fetch(
    `${BASE}/api/work-orders/reviews/summary?limit=5`,
    { headers: auth },
  ).then((r) => r.json());
  console.log(
    "[7] summary (co token) -> code=",
    summary.code,
    "| avg=",
    summary.result?.averageRating,
    "| count=",
    summary.result?.reviewCount,
    "| recent=",
    summary.result?.recentReviews?.length,
  );
  for (const r of summary.result?.recentReviews ?? []) {
    console.log(
      "      -",
      r.rating,
      "sao |",
      r.comment,
      "| dich vu:",
      (r.completedServices ?? []).join(", "),
    );
  }
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
