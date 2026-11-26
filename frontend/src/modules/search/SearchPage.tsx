/**
 * Trang kết quả tìm kiếm — `/search?q=...`
 *
 * Kết quả đến từ catalog thật của inventory-service (`GET /api/services`).
 * Phụ tùng không còn storefront riêng nên chỉ hiện trong BOM của từng dịch vụ.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconClose,
  IconArrowRight,
  IconWrench,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useCatalog } from "../../data/catalog";
import {
  countHits,
  searchAll,
  SEARCH_KIND_LABEL,
  type SearchKind,
} from "../../data/search";
import { formatCompactVND as compactVND } from "../../utils/format";

type TabId = SearchKind | "all";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Tất cả", icon: <IconSearch size={16} /> },
  { id: "service", label: "Dịch vụ", icon: <IconWrench size={16} /> },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { services, loading } = useCatalog();

  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [tab, setTab] = useState<TabId>("all");

  // Đồng bộ ô nhập khi đổi query từ bên ngoài (ví dụ bấm lại trên Header)
  useEffect(() => {
    setInput(query);
  }, [query]);

  const groups = useMemo(
    () => searchAll(query, { services }),
    [query, services],
  );

  const total = countHits(groups);

  const counts: Record<TabId, number> = {
    all: total,
    service: groups.services.length,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) {
      setParams({}, { replace: true });
      return;
    }
    setParams({ q }, { replace: true });
  };

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Tìm kiếm</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-1">Tìm kiếm</h1>
      <p className="text-sm text-ink-muted mb-5">
        {query ? (
          <>
            {total} kết quả cho{" "}
            <span className="font-semibold text-ink">"{query}"</span>
          </>
        ) : (
          "Nhập từ khoá để tìm dịch vụ sửa chữa."
        )}
      </p>

      {/* Ô tìm kiếm */}
      <form onSubmit={handleSubmit} className="mb-6">
        <Input
          placeholder="Tìm dịch vụ sửa chữa..."
          leftIcon={<IconSearch size={18} />}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>

      {/* Tabs lọc theo nhóm */}
      {query && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={counts[t.id] === 0 && t.id !== "all"}
              className={[
                "shrink-0 inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                tab === t.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-ink border-ink/15 hover:bg-bgsoft",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
              <span
                className={[
                  "ml-0.5 px-1.5 h-5 rounded-full text-[11px] inline-flex items-center",
                  tab === t.id ? "bg-white/20" : "bg-bgsoft text-ink-muted",
                ].join(" ")}
              >
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Kết quả rỗng */}
      {query && total === 0 && !loading && (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
              <IconSearch size={32} className="text-ink-muted" />
            </div>
            <p className="font-semibold text-lg mb-1">Không tìm thấy kết quả</p>
            <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
              Thử từ khoá khái quát hơn, ví dụ "thay dầu" hoặc "lốp" thay vì tên
              đầy đủ.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/services">
                <Button variant="outline">Xem dịch vụ</Button>
              </Link>
              <Link to="/ai/damage">
                <Button variant="outline">Phân tích hư hỏng</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Danh sách kết quả theo nhóm */}
      {query && total > 0 && (
        <div className="space-y-8">
          {(tab === "all" || tab === "service") && groups.services.length > 0 && (
            <Group
              title="Dịch vụ"
              count={groups.services.length}
              viewAllHref={`/services`}
            >
              {groups.services.map((s) => (
                <ResultRow
                  key={s.id}
                  to={`/services/${s.slug}`}
                  image={s.image}
                  title={s.name}
                  subtitle={`${s.category} · ~${s.durationMin} phút`}
                  priceVND={s.priceFrom}
                  badge={SEARCH_KIND_LABEL.service}
                />
              ))}
            </Group>
          )}
        </div>
      )}

      {/* Chưa có query */}
      {!query && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { to: "/services", label: "Dịch vụ sửa chữa", icon: "🔧" },
            { to: "/ai/damage", label: "Phân tích hư hỏng", icon: "📸" },
            { to: "/ai/assistant", label: "Trợ lý AI", icon: "💬" },
          ].map((c) => (
            <Link key={c.to} to={c.to}>
              <Card className="h-full">
                <div className="p-6 text-center">
                  <div className="text-3xl mb-2">{c.icon}</div>
                  <div className="font-semibold text-ink">{c.label}</div>
                  <div className="text-xs text-ink-muted mt-1 inline-flex items-center gap-1">
                    Xem tất cả <IconArrowRight size={12} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function Group({
  title,
  count,
  viewAllHref,
  children,
}: {
  title: string;
  count: number;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {title}
          <span className="text-xs font-semibold px-2 h-5 rounded-full bg-bgsoft text-ink-muted inline-flex items-center">
            {count}
          </span>
        </h2>
        <Link
          to={viewAllHref}
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Xem tất cả <IconArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ResultRow({
  to,
  image,
  title,
  subtitle,
  priceVND,
  badge,
}: {
  to: string;
  image?: string;
  title: string;
  subtitle: string;
  priceVND?: number;
  badge: string;
}) {
  return (
    <Link to={to}>
      <Card>
        <div className="p-3 flex items-center gap-3">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-14 h-14 rounded-xl object-cover bg-bgsoft shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-bgsoft shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-ink line-clamp-1">
              {title}
            </div>
            <div className="text-xs text-ink-muted line-clamp-1">{subtitle}</div>
          </div>
          {priceVND !== undefined && priceVND > 0 && (
            <div className="text-sm font-bold text-primary shrink-0">
              {compactVND(priceVND)}
            </div>
          )}
          <Badge tone="default" className="shrink-0 hidden sm:inline-flex">
            {badge}
          </Badge>
          <IconArrowRight
            size={16}
            className="text-ink-muted shrink-0 hidden sm:block"
          />
        </div>
      </Card>
    </Link>
  );
}

void IconClose;
