/**
 * Quét toàn bộ endpoint backend (annotation trong controller) và so sánh với
 * các đường dẫn frontend thực sự gọi.
 *
 * Mục tiêu: tìm ra gap frontend CHÍNH XÁC (thay vì con số "~5" ước lượng tay
 * trong API_CONNECTIVITY_ANALYSIS.md).
 *
 * Cách chạy: node scripts/gap-analysis.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// ---------------------------------------------------------------- helpers
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "target" || e === "node_modules" || e === ".git") continue;
      walk(p, out);
    } else if (e.endsWith(".java") || e.endsWith(".ts") || e.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

// --------------------------------------------- 1. BACKEND endpoints
const SERVICES = [
  "user-service",
  "inventory-service",
  "staff-service",
  "booking-service",
  "work-order-service",
  "customer-vehicle-service",
  "billing-service",
  "notification-service",
];

const METHOD_ANNOTATIONS = [
  "GetMapping",
  "PostMapping",
  "PutMapping",
  "PatchMapping",
  "DeleteMapping",
  "RequestMapping",
];

const backend = []; // { service, controller, method, httpMethod, path, internal }

for (const svc of SERVICES) {
  const ctlDir = join(ROOT, "backend", "services", svc, "src", "main", "java");
  const files = walk(ctlDir).filter((f) => f.endsWith("Controller.java"));
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const className = (src.match(/class\s+(\w+)/) || [])[1] || relative(ctlDir, file);

    // class-level @RequestMapping
    const classIdx = src.indexOf("class " + className);
    const header = src.slice(0, classIdx > 0 ? classIdx : src.length);
    const classBase = (header.match(/@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]+)"/) || [])[1] || "";

    // find each method-level mapping
    const lines = src.split(/\r?\n/);
    let currentHttp = null;
    let pendingPath = null;
    let pendingPre = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // class-level request mapping encountered again (reset)
      const ann = line.match(/@(Get|Post|Put|Patch|Delete|Request)Mapping\b/);
      if (ann) {
        const kind = ann[1];
        currentHttp =
          kind === "Request"
            ? null
            : kind.charAt(0) + kind.slice(1).toLowerCase();

        // path may be on same line or next lines
        let path = null;
        let searchText = line;
        let j = i;
        while (j < Math.min(i + 4, lines.length)) {
          const m = lines[j].match(/@?\w*Mapping\(\s*(?:value\s*=\s*)?\{?\s*"([^"]*)"/);
          if (m) {
            path = m[1];
            break;
          }
          if (/@(Get|Post|Put|Patch|Delete|Request)Mapping/.test(lines[j]) && j > i) {
            // hit next mapping without path -> path is ""
            path = "";
            break;
          }
          j++;
        }
        if (path === null) path = "";
        pendingPath = path;
        pendingPre = null;
        continue;
      }

      const pre = line.match(/@PreAuthorize\("([^"]+)"\)/);
      if (pre) {
        pendingPre = pre[1];
        continue;
      }

      // a method declaration
      const decl = line.match(/^\s*public\s+[\w<>,\[\]\s\.]+?\s+(\w+)\s*\(/);
      if (decl && pendingPath !== null) {
        // gather @RequestMapping(method=...) on the same annotation block
        let http = currentHttp;
        if (!http) {
          // look back for RequestMapping with method=
          for (let k = i; k >= Math.max(0, i - 6); k--) {
            const m = lines[k].match(
              /@RequestMapping\(\s*(?:value\s*=\s*)?[^)]*?method\s*=\s*RequestMethod\.(\w+)/,
            );
            if (m) {
              http = m[1];
              break;
            }
          }
          if (!http) http = "ANY";
        }

        let full = (classBase + pendingPath).replace(/\/+/g, "/");
        if (full.length > 1 && full.endsWith("/")) full = full.slice(0, -1);

        backend.push({
          service: svc,
          controller: className,
          method: decl[1],
          httpMethod: http,
          path: full,
          internal: full.startsWith("/internal"),
          pre: pendingPre,
        });

        pendingPath = null;
        pendingPre = null;
        currentHttp = null;
      }
    }
  }
}

// --------------------------------------------- 2. FRONTEND calls
const frontFiles = walk(join(ROOT, "frontend", "src"));
const frontendRaw = []; // { file, httpMethod, path }

/**
 * Frontend dùng 2 dạng:
 *   client.request<T>("/api/x", { method: "POST" })   -> method nằm trong options object
 *   client.get<T>("/api/x")                           -> method = verb
 *   client.request<T>(`/api/x/${id}`)                 -> template literal
 *
 * Ta quét theo từng "lệnh gọi": tìm điểm bắt đầu (client.request / client.get /
 * ...), rồi lấy chuỗi path đầu tiên trong vùng đó, và tìm `method: "X"`
 * trong cùng lệnh.
 */
/**
 * Client call trong frontend.
 *
 * Lưu ý: generic type có thể lồng nhau — `client.requestPage<PageResponse<PermissionResponse>>(`.
 * Vì vậy phần generic phải cân bằng dấu `<` / `>`, không dùng `[^>]*`.
 */
const CALL_RE =
  /\b(?:client|api|http|axios)\s*\.\s*(request|requestPage|requestVoid|get|post|put|patch|delete)\s*(?:<((?:[^<>]|<[^<>]*>)*)>)?\s*\(/i;

function extractFirstPath(text) {
  // backtick | double quote | single quote
  const m = text.match(/`([^`]*)`|"([^"]*)"|'([^']*)'/);
  if (!m) return null;
  const p = m[1] ?? m[2] ?? m[3];
  if (!p || !p.includes("/api/")) return null;
  return p;
}

/**
 * Gom vùng lệnh gọi: từ dòng `i` cho tới khi ngoặc ngoài cùng đóng lại.
 *
 * Phải BỎ QUA dấu `(` / `)` nằm trong chuỗi string — ví dụ
 * `` `/api/staff/availability?${qs.toString()}` `` chứa `toString()` làm
 * lệch số ngoặc nếu đếm mù.
 */
function collectCallRegion(lines, start, maxLines = 30) {
  let argText = "";
  let depth = 0;
  let started = false;

  for (let j = start; j < Math.min(start + maxLines, lines.length); j++) {
    const l = lines[j];
    let inStr = null; // ' | " | `
    for (let k = 0; k < l.length; k++) {
      const ch = l[k];
      if (inStr) {
        if (ch === "\\") {
          k++;
          continue;
        }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
        continue;
      }
      if (ch === "(") {
        depth++;
        started = true;
      } else if (ch === ")") {
        depth--;
      }
    }
    argText += l + "\n";
    if (started && depth <= 0) break;
  }
  return argText;
}

for (const file of frontFiles) {
  const src = readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    // SSE dùng fetch() trực tiếp (EventSource không set Authorization header)
    const isFetch = /^\s*(?:const\s+\w+\s*=\s*)?(?:await\s+)?fetch\s*\(/.test(lines[i]);
    const cm = lines[i].match(CALL_RE);
    if (!cm && !isFetch) continue;

    const fn = cm ? cm[1].toLowerCase() : "fetch";
    const argText = collectCallRegion(lines, i);

    const path = extractFirstPath(argText);
    if (!path) continue;

    let httpMethod;
    if (fn === "request" || fn === "requestpage" || fn === "requestvoid") {
      const mm = argText.match(/method\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/i);
      httpMethod = mm ? mm[1].toUpperCase() : "GET"; // default GET
    } else if (fn === "fetch") {
      const mm = argText.match(/method\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/i);
      httpMethod = mm ? mm[1].toUpperCase() : "GET";
    } else {
      httpMethod = fn.toUpperCase();
    }

    frontendRaw.push({
      file: relative(ROOT, file),
      httpMethod,
      path,
      line: i + 1,
    });
  }
}

// --------------------------------------------- 3. Normalize + match
/**
 * Chuẩn hoá path frontend về dạng so khớp được với backend.
 *
 * Cần xử lý interpolation **lồng nhau**: ví dụ
 *   `/api/work-order-service-lines/me${status ? `?status=${status}` : ""}`
 * có `${` chứa `${` bên trong — regex `\$\{[^}]*\}` đơn giản sẽ cắt sai.
 */
function normalizePath(p) {
  // Bỏ query string (dấu ? đầu tiên ngoài interpolation)
  let s = p;

  // Thay interpolation lồng nhau bằng :p — quét từ trái sang, đếm cân bằng {}
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "$" && s[i + 1] === "{") {
      let depth = 1;
      let j = i + 2;
      while (j < s.length && depth > 0) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") depth--;
        if (depth > 0) j++;
      }
      // j trỏ tới '}' đóng ngoài cùng
      const inner = s.slice(i + 2, j);
      // Interpolation là query-string nếu bên trong có '?' (vd
      // `${status ? `?status=${status}` : ""}`) -> bỏ hẳn khỏi path.
      if (inner.includes("?")) {
        // bỏ
      } else {
        out += ":p";
      }
      i = j + 1;
      continue;
    }
    out += s[i];
    i++;
  }
  s = out;

  // Bỏ query string (sau khi đã loại interpolation)
  const q = s.indexOf("?");
  if (q >= 0) s = s.slice(0, q);

  s = s.replace(/\/+/g, "/");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

/**
 * path template -> regex
 *
 * Backend dùng `{paramId}` (Spring), frontend dùng `${id}` (đã normalize thành
 * `:p`). Cả hai đều phải khớp được nhau.
 */
function toRegex(tpl) {
  let s = tpl;
  // escape mọi regex special (kể cả { } ) trước
  s = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // placeholder kiểu Spring: {paramId} -> [^/]+     (sau khi escape đã là \{...\})
  s = s.replace(/\\\{[^}]*\\\}/g, "[^/]+");
  // placeholder kiểu frontend: :p -> [^/]+
  s = s.replace(/:p/g, "[^/]+");
  return new RegExp("^" + s + "$");
}

const frontNorm = frontendRaw.map((f) => ({
  ...f,
  norm: normalizePath(f.path),
}));

// unique backend (method+path)
const backendUnique = new Map();
for (const b of backend) {
  b.httpMethod = String(b.httpMethod).toUpperCase();
  backendUnique.set(`${b.httpMethod} ${b.path}`, b);
}

const matched = new Map(); // backendKey -> frontend hits
for (const b of backendUnique.values()) {
  matched.set(`${b.httpMethod} ${b.path}`, []);
}

/**
 * So khớp 1 frontend path với các backend path ứng viên.
 *
 * Vấn đề: `/api/users/me` khớp cả regex của `/api/users/{id}` (vì `[^/]+`
 * khớp "me"). Nếu chỉ "first match wins" thì `/api/users/me` bị nuốt mất.
 *
 * Giải pháp: chấm điểm — mỗi segment LITERAL của backend khớp chính xác được
 * điểm cao hơn segment placeholder. Sau đó lấy ứng viên điểm cao nhất.
 */
function pathSegments(p) {
  return p.split("/").filter((s) => s.length > 0);
}

function isParamSegment(s) {
  return /^\{[^}]*\}$/.test(s) || s === ":p";
}

function matchScore(backendPath, frontPath) {
  const bs = pathSegments(backendPath);
  const fs = pathSegments(frontPath);
  if (bs.length !== fs.length) return -1;

  let score = 0;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    const f = fs[i];
    if (isParamSegment(b)) {
      score += 1; // placeholder khớp bất kỳ segment nào
    } else if (b === f) {
      score += 10; // literal khớp chính xác -> ưu tiên cao
    } else {
      return -1; // literal khác -> không khớp
    }
  }
  return score;
}

for (const f of frontNorm) {
  let best = null;
  let bestScore = -1;
  for (const b of backendUnique.values()) {
    if (b.httpMethod !== "ANY" && f.httpMethod !== b.httpMethod) continue;
    const s = matchScore(b.path, f.norm);
    if (s > bestScore) {
      bestScore = s;
      best = b;
    }
  }
  if (best && bestScore >= 0) {
    matched.get(`${best.httpMethod} ${best.path}`).push(f);
  }
}

if (process.env.GAP_DEBUG) {
  console.log("--- DEBUG: calls touching suspicious paths ---");
  for (const f of frontNorm) {
    if (/users|part-categories|service-categories|staff\/bookings|service-lines|customers/.test(f.norm)) {
      console.log(`  ${f.httpMethod} "${f.norm}"  <- ${f.file}:${f.line}  src=${f.path}`);
    }
  }
  console.log("--- DEBUG: backend candidates ---");
  for (const b of backendUnique.values()) {
    if (/users|part-categories|service-categories|staff\/bookings|service-lines|customers/.test(b.path)) {
      console.log(`  ${b.httpMethod} "${b.path}"  ${b.controller}.${b.method}()`);
    }
  }
}

// --------------------------------------------- 4. Report
const publicBackend = [...backendUnique.values()].filter((b) => !b.internal);
const internalBackend = [...backendUnique.values()].filter((b) => b.internal);

const gaps = publicBackend.filter(
  (b) => (matched.get(`${b.httpMethod} ${b.path}`) || []).length === 0,
);

const byService = {};
for (const g of gaps) {
  byService[g.service] = byService[g.service] || [];
  byService[g.service].push(g);
}

console.log("=".repeat(78));
console.log("GAP ANALYSIS — backend endpoints chưa được frontend gọi");
console.log("=".repeat(78));
console.log();
console.log(`Tổng endpoint backend (unique method+path): ${backendUnique.size}`);
console.log(`  - public  (/api/**):   ${publicBackend.length}`);
console.log(`  - internal(/internal): ${internalBackend.length}`);
console.log(`Frontend call sites đọc được:            ${frontendRaw.length}`);
console.log(`Public endpoints ĐÃ có frontend gọi:     ${publicBackend.length - gaps.length}`);
console.log(`Public endpoints CHƯA có frontend gọi:   ${gaps.length}`);
console.log();

if (gaps.length === 0) {
  console.log(">>> KHÔNG có gap. 100% public endpoint đã được frontend gọi.");
  console.log();
}

for (const [svc, list] of Object.entries(byService)) {
  console.log(`--- ${svc} (${list.length}) ---`);
  for (const g of list.sort((a, b) => a.path.localeCompare(b.path))) {
    console.log(`  ${g.httpMethod.padEnd(6)} ${g.path}`);
    console.log(`         ${g.controller}.${g.method}()  auth: ${g.pre ?? "(none)"}`);

    // Gợi ý: các endpoint cùng "họ" (cùng path nhưng khác method) đã được
    // frontend gọi -> cho biết frontend đã có sẵn helper, chỉ thiếu 1 biến thể.
    const base = g.path.replace(/\{[^}]*\}/g, ":id");
    const family = [...backendUnique.values()].filter(
      (o) => o.path.replace(/\{[^}]*\}/g, ":id") === base && o !== g,
    );
    const familyCalled = family.filter(
      (o) => (matched.get(`${o.httpMethod} ${o.path}`) || []).length > 0,
    );
    if (familyCalled.length > 0) {
      const first = familyCalled[0];
      const hits = matched.get(`${first.httpMethod} ${first.path}`) || [];
      const where = hits.length ? `  <- ${hits[0].file}:${hits[0].line}` : "";
      console.log(
        `         -> cùng họ đã có: ${familyCalled
          .map((o) => `${o.httpMethod} ${o.path}`)
          .join(", ")}${where}`,
      );
    }
  }
  console.log();
}

// also list internal for completeness
console.log("--- internal endpoints (frontend KHÔNG được gọi - đúng thiết kế) ---");
for (const b of internalBackend.sort((a, b) => a.path.localeCompare(b.path))) {
  console.log(`  ${b.httpMethod.padEnd(6)} ${b.path.padEnd(48)} ${b.service}`);
}

// dump unmatched frontend calls (potential typos / dead code)
const matchedFront = new Set();
for (const [k, hits] of matched) {
  for (const h of hits) matchedFront.add(h.file + ":" + h.line + ":" + h.path);
}
const orphanFront = frontNorm.filter((f) => !matchedFront.has(f.file + ":" + f.line + ":" + f.path));
console.log();
console.log("=".repeat(78));
console.log(`Frontend call sites KHÔNG khớp endpoint backend nào: ${orphanFront.length}`);
console.log("=".repeat(78));
const seen = new Set();
for (const o of orphanFront) {
  const key = o.file + "|" + o.norm;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  ${o.file}:${o.line}  ${o.httpMethod} ${o.norm}`);
}
