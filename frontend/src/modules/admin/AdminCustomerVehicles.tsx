import { useEffect, useState } from "react";
import {
  IconCar,
  IconUsers,
  IconWrench,
  IconSearch,
  IconPlus,
  IconRefresh,
  IconCalendar,
  IconCheckCircle,
  IconClose,
  IconNote,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import type {
  CustomerResponse,
  ServiceHistoryResponse,
  ServiceRecordType,
  VehicleResponse,
} from "../../api/types";

type SubTab = "vehicles" | "customers" | "history";

const RECORD_TYPE_META: Record<
  ServiceRecordType,
  { label: string; tone: "primary" | "accent" | "warning" }
> = {
  GARAGE_SERVICE: { label: "Hệ thống AutoCare", tone: "accent" },
  EXTERNAL_SERVICE: { label: "Garage ngoài", tone: "primary" },
  CUSTOMER_REPORTED: { label: "Khách tự báo", tone: "warning" },
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("vi-VN");
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AdminCustomerVehicles() {
  const t = useToast();
  const [subTab, setSubTab] = useState<SubTab>("vehicles");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [histories, setHistories] = useState<ServiceHistoryResponse[]>([]);

  // Modal states
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null);
  const [vehicleHistories, setVehicleHistories] = useState<ServiceHistoryResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    licensePlate: "",
    make: "Toyota",
    model: "",
    modelYear: 2023,
    trim: "",
    color: "Trắng",
    fuelType: "Xăng",
    transmission: "Tự động",
    odometerKm: 15000,
    vin: "",
    notes: "",
  });

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [newHistory, setNewHistory] = useState({
    recordType: "EXTERNAL_SERVICE" as "EXTERNAL_SERVICE" | "CUSTOMER_REPORTED",
    odometerKm: "",
    summary: "",
    description: "",
    garageName: "AutoCare Workshop",
  });

  const loadAll = async (kw = search) => {
    setLoading(true);
    try {
      const [vPage, cPage, hPage] = await Promise.all([
        customerVehicleApi.listVehicles({ keyword: kw || undefined, size: 50 }),
        customerVehicleApi.listCustomers({ keyword: kw || undefined, size: 50 }),
        customerVehicleApi.getMyServiceHistory(0, 50),
      ]);
      setVehicles(vPage.items || []);
      setCustomers(cPage.items || []);
      setHistories(hPage.items || []);
    } catch (err) {
      t.error("Không thể tải dữ liệu từ customer-vehicle-service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll("");
  }, []);

  const openVehicleHistory = async (v: VehicleResponse) => {
    setSelectedVehicle(v);
    setNewHistory((prev) => ({
      ...prev,
      odometerKm: v.odometerKm ? String(v.odometerKm) : "",
    }));
    setLoadingHistory(true);
    try {
      const res = await customerVehicleApi.getVehicleServiceHistory(v.id, 0, 30);
      setVehicleHistories(res.items || []);
    } catch {
      setVehicleHistories([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.licensePlate.trim() || !newVehicle.make.trim() || !newVehicle.model.trim()) {
      t.error("Vui lòng nhập biển số, hãng xe và dòng xe");
      return;
    }
    try {
      await customerVehicleApi.createVehicle({
        licensePlate: newVehicle.licensePlate.trim().toUpperCase(),
        make: newVehicle.make.trim(),
        model: newVehicle.model.trim(),
        modelYear: Number(newVehicle.modelYear) || 2023,
        trim: newVehicle.trim.trim() || null,
        color: newVehicle.color.trim() || null,
        fuelType: newVehicle.fuelType.trim() || null,
        transmission: newVehicle.transmission.trim() || null,
        odometerKm: Number(newVehicle.odometerKm) || 0,
        vin: newVehicle.vin.trim().length === 17 ? newVehicle.vin.trim().toUpperCase() : null,
        notes: newVehicle.notes.trim() || null,
        isActive: true,
      });
      t.success("Đã thêm hồ sơ xe mới vào customer-vehicle-service");
      setShowAddVehicle(false);
      setNewVehicle({
        licensePlate: "",
        make: "Toyota",
        model: "",
        modelYear: 2023,
        trim: "",
        color: "Trắng",
        fuelType: "Xăng",
        transmission: "Tự động",
        odometerKm: 15000,
        vin: "",
        notes: "",
      });
      await loadAll();
    } catch (err) {
      t.error((err as Error).message || "Không thể tạo xe");
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.fullName.trim()) {
      t.error("Vui lòng nhập họ tên khách hàng");
      return;
    }
    try {
      await customerVehicleApi.createCustomer({
        fullName: newCustomer.fullName.trim(),
        phone: newCustomer.phone.trim() || null,
        email: newCustomer.email.trim() || null,
        address: newCustomer.address.trim() || null,
        notes: newCustomer.notes.trim() || null,
        isActive: true,
      });
      t.success("Đã tạo hồ sơ khách hàng thành công");
      setShowAddCustomer(false);
      setNewCustomer({ fullName: "", phone: "", email: "", address: "", notes: "" });
      await loadAll();
    } catch (err) {
      t.error((err as Error).message || "Không thể tạo hồ sơ khách hàng");
    }
  };

  const handleAddServiceHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !newHistory.summary.trim()) {
      t.error("Vui lòng nhập hạng mục bảo dưỡng/sửa chữa");
      return;
    }
    try {
      await customerVehicleApi.createVehicleServiceHistory(selectedVehicle.id, {
        recordType: newHistory.recordType,
        serviceDate: new Date().toISOString(),
        odometerKm: newHistory.odometerKm ? Number(newHistory.odometerKm) : selectedVehicle.odometerKm,
        summary: newHistory.summary.trim(),
        description: newHistory.description.trim() || null,
        garageName: newHistory.garageName.trim() || null,
      });
      t.success("Đã ghi nhận lịch sử bảo dưỡng cho xe " + selectedVehicle.licensePlate);
      setNewHistory((prev) => ({ ...prev, summary: "", description: "" }));
      await openVehicleHistory(selectedVehicle);
      await loadAll();
    } catch (err) {
      t.error((err as Error).message || "Không thể thêm lịch sử bảo dưỡng");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconCar size={22} />
            </span>
            Hồ sơ Xe & Khách hàng (Customer-Vehicle Service)
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Đồng bộ trực tiếp với MySQL{" "}
            <code className="text-xs bg-bgsoft px-1.5 py-0.5 rounded">
              customer_vehicle_service
            </code>{" "}
            ({vehicles.length} phương tiện · {customers.length} khách hàng ·{" "}
            {histories.length} bản ghi bảo dưỡng)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
          <Button size="sm" onClick={() => setShowAddVehicle(true)}>
            <IconPlus size={14} /> Thêm xe
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustomer(true)}
          >
            <IconPlus size={14} /> Thêm khách hàng
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSubTab("vehicles")}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              subTab === "vehicles"
                ? "bg-primary text-white"
                : "bg-white border border-ink/10 text-ink hover:bg-bgsoft",
            ].join(" ")}
          >
            <IconCar size={16} />
            Phương tiện ({vehicles.length})
          </button>
          <button
            onClick={() => setSubTab("customers")}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              subTab === "customers"
                ? "bg-primary text-white"
                : "bg-white border border-ink/10 text-ink hover:bg-bgsoft",
            ].join(" ")}
          >
            <IconUsers size={16} />
            Khách hàng ({customers.length})
          </button>
          <button
            onClick={() => setSubTab("history")}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              subTab === "history"
                ? "bg-primary text-white"
                : "bg-white border border-ink/10 text-ink hover:bg-bgsoft",
            ].join(" ")}
          >
            <IconWrench size={16} />
            Nhật ký bảo dưỡng ({histories.length})
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadAll(search);
          }}
          className="flex items-center gap-2 max-w-md w-full"
        >
          <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl border border-ink/15 bg-white">
            <IconSearch size={16} className="text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm biển số (51H-123.45), hãng xe, tên KH, SĐT..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Tìm
          </Button>
        </form>
      </div>

      {/* Tab 1: Vehicles */}
      {subTab === "vehicles" && (
        <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/40">
                  <th className="px-4 py-3 font-medium">Biển số</th>
                  <th className="px-4 py-3 font-medium">Hãng & Dòng xe</th>
                  <th className="px-4 py-3 font-medium">Thông số</th>
                  <th className="px-4 py-3 font-medium text-right">Số ODO</th>
                  <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Lịch sử bảo dưỡng</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/30"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg text-xs">
                        {v.licensePlate}
                      </span>
                      {v.vin && (
                        <div className="text-[11px] text-ink-muted mt-1 font-mono">
                          VIN: {v.vin}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">
                        {v.make} {v.model} {v.trim || ""}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Đời {v.modelYear || "—"} · Màu: {v.color || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-light">
                      <div>Nhiên liệu: {v.fuelType || "—"}</div>
                      <div>Hộp số: {v.transmission || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {v.odometerKm != null
                        ? `${v.odometerKm.toLocaleString("vi-VN")} km`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.isActive ? (
                        <Badge tone="accent">Hoạt động</Badge>
                      ) : (
                        <Badge tone="warning">Tạm ngưng</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openVehicleHistory(v)}
                      >
                        <IconWrench size={14} /> Xem & Ghi lịch sử
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Customers */}
      {subTab === "customers" && (
        <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/40">
                  <th className="px-4 py-3 font-medium">Khách hàng</th>
                  <th className="px-4 py-3 font-medium">Liên hệ</th>
                  <th className="px-4 py-3 font-medium">Địa chỉ</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/30"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{c.fullName}</div>
                      <div className="text-[11px] text-ink-muted font-mono">
                        ID: {c.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-ink">{c.phone || "—"}</div>
                      <div className="text-ink-muted">{c.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-light max-w-xs">
                      {c.address || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted max-w-xs">
                      {c.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.isActive ? (
                        <Badge tone="accent">Đang hoạt động</Badge>
                      ) : (
                        <Badge tone="warning">Tạm ngưng</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Service History Timeline */}
      {subTab === "history" && (
        <div className="space-y-3">
          {histories.map((h) => {
            const meta = RECORD_TYPE_META[h.recordType] || {
              label: h.recordType,
              tone: "default" as const,
            };
            return (
              <Card key={h.id} hover={false}>
                <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.licensePlate && (
                        <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {h.licensePlate}
                        </span>
                      )}
                      <span className="font-bold text-ink">{h.summary}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    {h.description && (
                      <p className="text-sm text-ink-light">{h.description}</p>
                    )}
                    <div className="text-xs text-ink-muted flex flex-wrap gap-3 pt-1">
                      <span className="flex items-center gap-1">
                        <IconCalendar size={12} /> {fmtDate(h.serviceDate)}
                      </span>
                      {h.odometerKm != null && (
                        <span>
                          · ODO:{" "}
                          <strong className="text-ink">
                            {h.odometerKm.toLocaleString("vi-VN")} km
                          </strong>
                        </span>
                      )}
                      {h.garageName && <span>· Garage: {h.garageName}</span>}
                      {h.customerName && (
                        <span>· Người mang xe: {h.customerName}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Vehicle Service History & Add Record */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg text-sm">
                    {selectedVehicle.licensePlate}
                  </span>
                  <h3 className="text-lg font-bold">
                    {selectedVehicle.make} {selectedVehicle.model}{" "}
                    {selectedVehicle.trim || ""} ({selectedVehicle.modelYear})
                  </h3>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  ODO hiện tại:{" "}
                  <strong>
                    {(selectedVehicle.odometerKm || 0).toLocaleString("vi-VN")} km
                  </strong>{" "}
                  · VIN: {selectedVehicle.vin || "Chưa đăng ký"}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-lg hover:bg-bgsoft"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Add new history form */}
            <form
              onSubmit={handleAddServiceHistory}
              className="bg-bgsoft/50 rounded-xl p-4 space-y-3 border border-ink/8"
            >
              <div className="text-sm font-bold flex items-center gap-1.5">
                <IconPlus size={15} className="text-primary" />
                Ghi nhận lần bảo dưỡng / sửa chữa mới
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Hạng mục tóm tắt *"
                  placeholder="VD: Bảo dưỡng định kỳ 45.000 km"
                  value={newHistory.summary}
                  onChange={(e) =>
                    setNewHistory({ ...newHistory, summary: e.target.value })
                  }
                  required
                />
                <Input
                  label="Số km (ODO) lúc bảo dưỡng"
                  type="number"
                  value={newHistory.odometerKm}
                  onChange={(e) =>
                    setNewHistory({ ...newHistory, odometerKm: e.target.value })
                  }
                />
                <Input
                  label="Tên Garage thực hiện"
                  value={newHistory.garageName}
                  onChange={(e) =>
                    setNewHistory({ ...newHistory, garageName: e.target.value })
                  }
                />
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Nguồn bản ghi
                  </label>
                  <select
                    value={newHistory.recordType}
                    onChange={(e) =>
                      setNewHistory({
                        ...newHistory,
                        recordType: e.target.value as
                          | "EXTERNAL_SERVICE"
                          | "CUSTOMER_REPORTED",
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-ink/15 bg-white text-sm"
                  >
                    <option value="EXTERNAL_SERVICE">
                      EXTERNAL_SERVICE (Garage đối tác)
                    </option>
                    <option value="CUSTOMER_REPORTED">
                      CUSTOMER_REPORTED (Khách tự báo)
                    </option>
                  </select>
                </div>
              </div>
              <Input
                label="Mô tả chi tiết phụ tùng / công việc"
                placeholder="VD: Thay dầu tổng hợp 0W-20, lọc dầu, đảo lốp cân bằng động..."
                value={newHistory.description}
                onChange={(e) =>
                  setNewHistory({ ...newHistory, description: e.target.value })
                }
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  <IconCheckCircle size={14} /> Lưu vào lịch sử xe
                </Button>
              </div>
            </form>

            {/* History list */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm">
                Lịch sử đã ghi nhận ({vehicleHistories.length})
              </h4>
              {loadingHistory ? (
                <div className="text-sm text-ink-muted py-4">Đang tải...</div>
              ) : vehicleHistories.length === 0 ? (
                <div className="text-sm text-ink-muted py-4">
                  Chưa có bản ghi lịch sử bảo dưỡng nào cho xe này.
                </div>
              ) : (
                vehicleHistories.map((h) => {
                  const meta = RECORD_TYPE_META[h.recordType] || {
                    label: h.recordType,
                    tone: "default" as const,
                  };
                  return (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-xl border border-ink/10 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink">
                          {h.summary}
                        </span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      {h.description && (
                        <p className="text-xs text-ink-light">{h.description}</p>
                      )}
                      <div className="text-[11px] text-ink-muted flex flex-wrap gap-3 pt-1">
                        <span>Ngày: {fmtDate(h.serviceDate)}</span>
                        {h.odometerKm != null && (
                          <span>
                            ODO: {h.odometerKm.toLocaleString("vi-VN")} km
                          </span>
                        )}
                        {h.garageName && <span>Garage: {h.garageName}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Vehicle */}
      {showAddVehicle && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowAddVehicle(false)}
        >
          <form
            onSubmit={handleCreateVehicle}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="text-lg font-bold">Thêm phương tiện mới</h3>
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="p-1 rounded-lg hover:bg-bgsoft"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Biển số xe *"
                placeholder="VD: 51K-888.99"
                value={newVehicle.licensePlate}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, licensePlate: e.target.value })
                }
                required
              />
              <Input
                label="Hãng xe (Make) *"
                placeholder="VD: Toyota, Mazda, VinFast"
                value={newVehicle.make}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, make: e.target.value })
                }
                required
              />
              <Input
                label="Dòng xe (Model) *"
                placeholder="VD: Corolla Cross, CX-5"
                value={newVehicle.model}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, model: e.target.value })
                }
                required
              />
              <Input
                label="Phiên bản (Trim)"
                placeholder="VD: 1.8V, Premium"
                value={newVehicle.trim}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, trim: e.target.value })
                }
              />
              <Input
                label="Năm sản xuất"
                type="number"
                value={String(newVehicle.modelYear)}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    modelYear: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Số ODO hiện tại (km)"
                type="number"
                value={String(newVehicle.odometerKm)}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    odometerKm: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Màu sơn"
                value={newVehicle.color}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, color: e.target.value })
                }
              />
              <Input
                label="Số khung VIN (17 ký tự, tuỳ chọn)"
                value={newVehicle.vin}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, vin: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddVehicle(false)}
              >
                Huỷ
              </Button>
              <Button type="submit">Lưu phương tiện</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAddCustomer && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowAddCustomer(false)}
        >
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <h3 className="text-lg font-bold">Thêm hồ sơ khách hàng</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="p-1 rounded-lg hover:bg-bgsoft"
              >
                <IconClose size={18} />
              </button>
            </div>
            <Input
              label="Họ và tên *"
              placeholder="VD: Nguyễn Minh Tuấn"
              value={newCustomer.fullName}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, fullName: e.target.value })
              }
              required
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Số điện thoại"
                placeholder="VD: 0909123456"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                placeholder="tuan@example.com"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
              />
            </div>
            <Input
              label="Địa chỉ"
              value={newCustomer.address}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, address: e.target.value })
              }
            />
            <Input
              label="Ghi chú"
              leftIcon={<IconNote size={16} />}
              value={newCustomer.notes}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, notes: e.target.value })
              }
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCustomer(false)}
              >
                Huỷ
              </Button>
              <Button type="submit">Lưu khách hàng</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

