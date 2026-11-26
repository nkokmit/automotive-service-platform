/**
 * Kiem tra ma tran phan quyen admin khop voi backend.
 *
 * <p>Chay: `npx tsx scripts/check-admin-access.ts` (hoac `node --experimental-strip-types`).
 *
 * <p>Script nay doc cac migration SQL trong user-service, tom tat quyen cua
 * tung role, roi so sanh voi `frontend/src/config/adminAccess.ts`. Muc dich:
 * phat hien ngay khi backend them/bot permission ma frontend chua cap nhat.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATION_DIR = join(
  __dirname,
  "..",
  "..",
  "backend",
  "services",
  "user-service",
  "src",
  "main",
  "resources",
  "db",
  "migration",
);

/** Permission → các role được cấp (đọc từ tất cả migration). */
const rolePermissions: Record<string, Set<string>> = {};
const allPermissions = new Set<string>();

for (const file of readdirSync(MIGRATION_DIR).filter((f) => f.endsWith(".sql"))) {
  const sql = readFileSync(join(MIGRATION_DIR, file), "utf8");

  // Khối `INSERT INTO permissions ... VALUES (...)` — lấy tên permission.
  // Có 2 format trong các migration:
  //   1. `FROM ( SELECT 'id' AS id, 'NAME' AS name ... ) AS seed`
  //   2. `VALUES ('id', 'NAME', 'display', 'desc'), ...`
  const permBlock = sql.match(
    /INSERT INTO permissions[\s\S]*?FROM \(([\s\S]*?)\) AS seed/,
  );
  if (permBlock) {
    // Dạng 1: `SELECT 'id' AS id, 'NAME' AS name`
    for (const m of permBlock[1].matchAll(
      /UNION ALL SELECT '[^']+'\s*,\s*'([A-Z_]+)'/g,
    )) {
      allPermissions.add(m[1]);
    }
    // Dạng 2: `SELECT 'id' AS id,\n 'NAME' AS name` (xuống dòng) hoặc
    // `'NAME' AS name` đứng riêng — bắt mọi cặp `'NAME' AS name`.
    for (const m of permBlock[1].matchAll(
      /'([A-Z_]+)'\s*(?:AS\s+name|,)/g,
    )) {
      allPermissions.add(m[1]);
    }
  }
  const valuesBlock = sql.match(
    /INSERT INTO permissions[\s\S]*?VALUES\s*([\s\S]*?);/,
  );
  if (valuesBlock) {
    for (const m of valuesBlock[1].matchAll(
      /\(\s*'[0-9a-f-]+'\s*,\s*'([A-Z_]+)'/g,
    )) {
      allPermissions.add(m[1]);
    }
  }

  // Khối `INSERT INTO role_permissions ... WHERE r.name IN (...)`.
  for (const block of sql.matchAll(
    /INSERT INTO role_permissions[\s\S]*?JOIN permissions p ON p\.name IN \(([\s\S]*?)\)\s*\nWHERE r\.name (?:IN \(([^)]*)\)|= '([A-Z_]+)')/g,
  )) {
    const perms = block[1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .filter(Boolean);
    const roles = (block[2] ?? block[3] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .filter(Boolean);
    for (const role of roles) {
      rolePermissions[role] ??= new Set();
      for (const p of perms) rolePermissions[role].add(p);
    }
  }
}

const ROLES = ["ADMIN", "MANAGER", "SERVICE_ADVISOR", "MECHANIC", "CASHIER"];

console.log("=== Quyen cua tung role (tu migration) ===");
for (const role of ROLES) {
  const perms = [...(rolePermissions[role] ?? [])].sort();
  console.log(`\n${role} (${perms.length}):`);
  console.log("  " + perms.join(", "));
}
console.log(`\nTong permission da seed: ${allPermissions.size}`);

// ── So sanh voi ma tran frontend ────────────────────────────────────────────

/** Đọc ma trận frontend từ `config/adminAccess.ts` (parse thô). */
function readFrontendRules(): { path: string; anyOf: string[] }[] {
  const src = readFileSync(
    join(__dirname, "..", "src", "config", "adminAccess.ts"),
    "utf8",
  );

  // Bảng hằng số: `export const INVOICE_READ = "INVOICE_READ";`
  const constMap = new Map<string, string>();
  for (const m of src.matchAll(
    /export const ([A-Z_]+)\s*=\s*"([A-Z_]+)"/g,
  )) {
    constMap.set(m[1], m[2]);
  }

  /** Resolve một tên hằng số (hoặc literal) về tên authority thật. */
  const resolve = (name: string): string => {
    const direct = constMap.get(name);
    if (direct) return direct;
    if (/^[A-Z_]+$/.test(name) && allPermissions.has(name)) return name;
    return name;
  };

  const rules: { path: string; anyOf: string[] }[] = [];
  // Khối `{ path: "...", anyOf: [...] },`
  const re = /\{\s*path:\s*"([^"]+)"\s*,\s*anyOf:\s*\[([^\]]*)\]/g;
  for (const m of src.matchAll(re)) {
    const anyOf = [...m[2].matchAll(/([A-Z_]+)/g)].map((x) =>
      resolve(x[1]),
    );
    rules.push({ path: m[1], anyOf });
  }
  return rules;
}

const frontendRules = readFrontendRules();

console.log("\n\n=== Ma tran frontend vs DB ===\n");

let hasError = false;

for (const rule of frontendRules) {
  // Authority nào trong rule không tồn tại trong DB → lỗi cấu hình.
  const unknown = rule.anyOf.filter((a) => !allPermissions.has(a));
  if (unknown.length > 0) {
    hasError = true;
    console.log(
      `LOI  ${rule.path}: authority khong ton tai trong DB: ${unknown.join(", ")}`,
    );
  }

  // Role nào được phép vào route này (theo DB)?
  const allowedRoles = ROLES.filter((role) =>
    rule.anyOf.some((a) => rolePermissions[role]?.has(a)),
  );

  // Role nào có trong DB nhưng rule lại chặn (có ít nhất 1 quyền liên quan)?
  console.log(`${rule.path}`);
  console.log(`  authority: ${rule.anyOf.join(", ")}`);
  console.log(`  roles vao duoc: ${allowedRoles.join(", ") || "(khong ai)"}`);
}

console.log(
  hasError
    ? "\n=> Co loi. Sua mau tran frontend truoc khi merge."
    : "\n=> Khong co authority nao trong ma tran frontend bi thieu.",
);

