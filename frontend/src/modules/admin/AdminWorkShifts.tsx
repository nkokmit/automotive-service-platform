/**
 * AdminWorkShifts — quản lý ca làm việc của xưởng.
 *
 * Nguồn dữ liệu (staff-service):
 *  - GET    /api/work-shifts          → danh sách ca (lọc keyword/isActive)
 *  - GET    /api/work-shifts/{id}     → chi tiết ca
 *  - POST   /api/work-shifts          → tạo ca
 *  - PUT    /api/work-shifts/{id}     → cập nhật ca
 *  - PATCH  /api/work-shifts/{id}/is-active → bật/tắt ca
 *  - DELETE /api/work-shifts/{id}     → xoá ca
 *
 * Cần authority: WORK_SHIFT_READ (xem) / WORK_SHIFT_CREATE, WORK_SHIFT_UPDATE,
 * WORK_SHIFT_DELETE (ghi).
 *
 * Lưu ý:
 *  - `startTime` / `endTime` là `LocalTime` của Java — gửi `HH:mm` hoặc `HH:mm:ss`.
 *  - Ca qua đêm (end < start) được backend chấp nhận — hiển thị thêm dấu "+1 ngày".
 *  - Ca đã dùng trong lịch thì backend KHÔNG cho xoá cứng (lỗi 3103) — phải
 *    tắt hoạt động bằng `isActive=false`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconClock,
  IconRefresh,
  IconSearch,
  IconCheckCircle,
  IconClose,
  IconWarning,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../../components/AdminTable";
import { useToast } from "../../components/Toast";
import { workShiftApi } from "../../api/endpoints/staff";
import { hasTokenAuthority } from "../../api/session";
import type { WorkShiftResponse } from "../../api/types";

// =========================
// Helpers
// =========================

/**
 * Chuẩn hoá giờ của backend (`HH:mm:ss`) về `HH:mm` cho ô nhập.
 *
 * <p>Java `LocalTime` serialize ra `"08:00:00"`, nhưng `<input type="time">`
 * chỉ nhận `"HH:mm"` — nếu gửi nguyên `"08:00:00"` thì browser sẽ từ chối.
 */
function toTimeInput(iso: string): string {
  return (iso ?? "").slice(0, 5);
}

/** `HH:mm` → `HH:mm:ss` — backend parse `LocalTime` cần giây (hoặc không). */
function toApiTime(value: string): string {
  const v = value.trim();
  if (!v) return v;
  return v.length === 5 ? `${v}:00` : v;
}

/** Ca có qua nửa đêm không (end < start). */
function isOvernight(shift: WorkShiftResponse): boolean {
  return shift.endTime < shift.startTime;
}

/** Nhãn giờ hiển thị, kèm cảnh báo khi ca qua đêm. */
function timeRangeLabel(shift: WorkShiftResponse): string {
  const start = toTimeInput(shift.startTime);
  const end = toTimeInput(shift.endTime);
  return isOvernight(shift) ? `${start} → ${end} (+1 ngày)` : `${start} → ${end}`;
}

// =========================
// Columns
// =========================

const columns: AdminTableColumn<WorkShiftResponse>[] = [
  {
    key: "name",
    label: "Ca làm việc",
    render: (s) => (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <IconClock size={16} />
        </span>
        <div className="min-w-0">
          <span className="font-semibold text-sm line-clamp-1 block">{s.name}</span>
          <div className="text-xs text-ink-muted font-mono">{s.code}</div>
        </div>
      </div>
    ),
  },
  {
    key: "time",
    label: "Giờ",
    align: "center",
    render: (s) => (
      <div className="text-sm">
        <span className="font-mono">{timeRangeLabel(s)}</span>
        {isOvernight(s) && (
          <div
            className="text-[10px] text-amber-700 flex items-center justify-center gap-1 mt-0.5"
            title="Ca kéo dài qua nửa đêm"
          >
            <IconWarning size={10} />
            qua đêm
          </div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (s) =>
      s.isActive ? (
        <Badge tone="accent">
          <IconCheckCircle size={11} /> Đang dùng
        </Badge>
      ) : (
        <Badge tone="default">
          <IconClose size={11} /> Tạm ngưng
        </Badge>
      ),
  },
];

const filters: AdminTableFilter<WorkShiftResponse>[] = [
  { id: "active", label: "Đang dùng", predicate: (s) => s.isActive === true },
  {
    id: "inactive",
    label: "Tạm ngưng",
    predicate: (s) => s.isActive !== true,
  },
];

// =========================
// AdminWorkShifts
// =========================

export default function AdminWorkShifts() {
  const t = useToast();
  const [shifts, setShifts] = useState<WorkShiftResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Ô tìm kiếm (chưa áp dụng) — chỉ gửi lên server khi bấm "Tìm" / Enter. */
  const [keywordInput, setKeywordInput] = useState("");
  /** Từ khoá đã áp dụng (`keyword` của `/api/work-shifts`). */
  const [keyword, setKeyword] = useState("");

  const canCreate = hasTokenAuthority("WORK_SHIFT_CREATE");
  const canUpdate = hasTokenAuthority("WORK_SHIFT_UPDATE");
  const canDelete = hasTokenAuthority("WORK_SHIFT_DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workShiftApi.listWorkShifts({
        size: 100,
        keyword: keyword.trim() || undefined,
      });
      setShifts(res.items ?? []);
    } catch (err) {
      setShifts([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách ca làm việc từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Bật/tắt ca — backend dùng PATCH `/is-active`. */
  const handleToggleActive = useCallback(
    async (row: WorkShiftResponse) => {
      const next = row.isActive !== true;
      try {
        const updated = await workShiftApi.updateWorkShiftIsActive(row.id, next);
        setShifts((prev) => prev.map((s) => (s.id === row.id ? updated : s)));
        t.success(
          next ? `Đã kích hoạt ca "${updated.name}"` : `Đã tạm ngưng ca "${updated.name}"`,
        );
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không cập nhật được trạng thái ca",
        );
      }
    },
    [t],
  );

  const handleDelete = useCallback(
    async (row: WorkShiftResponse) => {
      await workShiftApi.deleteWorkShift(row.id);
      t.success(`Đã xoá ca "${row.name}"`);
      return { ...row, isActive: false };
    },
    [t],
  );

  const form: AdminFormProps<WorkShiftResponse> = useMemo(
    () => ({
      addTitle: "Thêm ca làm việc",
      editTitle: "Cập nhật ca làm việc",
      fields: [
        {
          key: "code",
          label: "Mã ca",
          type: "text",
          required: true,
          placeholder: "VD: CA-SANG",
          hint: "Tối đa 50 ký tự, phải duy nhất trong hệ thống.",
        },
        {
          key: "name",
          label: "Tên ca",
          type: "text",
          required: true,
          placeholder: "VD: Ca sáng",
          hint: "Tối đa 100 ký tự.",
        },
        {
          key: "startTime",
          label: "Giờ bắt đầu",
          type: "text",
          required: true,
          placeholder: "08:00",
          hint: "Định dạng HH:mm. Ca qua đêm được phép (end < start).",
        },
        {
          key: "endTime",
          label: "Giờ kết thúc",
          type: "text",
          required: true,
          placeholder: "17:00",
          hint: "Định dạng HH:mm.",
        },
        {
          key: "isActive",
          label: "Đang hoạt động",
          type: "select",
          options: [
            { value: "true", label: "Có" },
            { value: "false", label: "Không" },
          ],
          modes: ["add"],
        },
      ],
      onSubmit: async (values, initial) => {
        const payload = {
          code: String(values.code).trim(),
          name: String(values.name).trim(),
          startTime: toApiTime(String(values.startTime)),
          endTime: toApiTime(String(values.endTime)),
          ...(initial
            ? {}
            : { isActive: String(values.isActive ?? "true") === "true" }),
        };

        if (!payload.code) throw new Error("Mã ca không được để trống.");
        if (!payload.name) throw new Error("Tên ca không được để trống.");
        if (!payload.startTime || !payload.endTime) {
          throw new Error("Giờ bắt đầu và giờ kết thúc là bắt buộc.");
        }

        const saved = initial
          ? await workShiftApi.updateWorkShift(initial.id, payload)
          : await workShiftApi.createWorkShift(payload);

        setShifts((prev) =>
          initial
            ? prev.map((s) => (s.id === saved.id ? saved : s))
            : [saved, ...prev],
        );
        t.success(
          initial
            ? `Đã cập nhật ca "${saved.name}"`
            : `Đã thêm ca "${saved.name}"`,
        );
        return saved;
      },
    }),
    [t],
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconClock size={20} />
            </span>
            Ca làm việc
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải danh sách ca làm việc..."
              : `${shifts.length} ca làm việc trong hệ thống`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Tìm kiếm */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Tìm ca theo mã hoặc tên..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setKeyword(keywordInput);
              }}
              leftIcon={<IconSearch size={16} />}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKeyword(keywordInput)}
          >
            <IconSearch size={14} />
            Tìm
          </Button>
          {keyword !== keywordInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeywordInput("");
                setKeyword("");
              }}
            >
              Xoá
            </Button>
          )}
        </div>
      </Card>

      {/* Bảng */}
      <Card hover={false}>
        <AdminTable<WorkShiftResponse>
          title="Danh sách ca làm việc"
          icon={<IconClock size={18} />}
          data={shifts}
          columns={columns}
          filters={filters}
          addLabel="Thêm ca làm việc"
          form={form}
          onDelete={canDelete ? handleDelete : undefined}
          readOnly={!canCreate && !canUpdate && !canDelete}
          emptyMessage={
            loading ? "Đang tải..." : "Chưa có ca làm việc nào."
          }
        />
      </Card>

      {/* Nút bật/tắt — tách riêng vì AdminTable không có hành động tuỳ biến */}
      {canUpdate && (
        <Card hover={false}>
          <div className="px-4 py-3 border-t border-ink/8 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-muted mr-1">
              Bật/tắt nhanh:
            </span>
            {shifts.map((s) => (
              <button
                key={s.id}
                onClick={() => void handleToggleActive(s)}
                className={[
                  "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                  s.isActive
                    ? "bg-bgsoft text-ink-muted hover:bg-ink/10"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200",
                ].join(" ")}
                title={timeRangeLabel(s)}
              >
                {s.code} · {toTimeInput(s.startTime)}–{toTimeInput(s.endTime)}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
