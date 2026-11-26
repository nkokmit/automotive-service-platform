import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import { hydrateUser } from "./data/authStore";

// Auth module
import Login from "./modules/auth/Login";
import Profile from "./modules/auth/Profile";

// Commerce module (services)
import ServicesList from "./modules/commerce/ServicesList";
import ServiceDetail from "./modules/commerce/ServiceDetail";

// AI module
import DamageUpload from "./modules/ai/DamageUpload";
import ChatAssistant from "./modules/ai/ChatAssistant";

// Content module (static pages)
import {
  HelpPage,
  TermsPage,
  PrivacyPage,
} from "./modules/content/StaticPages";

// Search module
import SearchPage from "./modules/search/SearchPage";

import { ErrorBoundary, NotFoundPage } from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./components/AdminLayout";
import { ToastProvider } from "./components/Toast";
import Card from "./components/Card";
import Button from "./components/Button";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconSparkles, IconSettings } from "./components/icons";
import "./styles/globals.css";

import AdminDashboard from "./modules/admin/AdminDashboard";
import AdminServices from "./modules/admin/AdminServices";
import AdminParts from "./modules/admin/AdminParts";
import AdminSuppliers from "./modules/admin/AdminSuppliers";
import AdminPurchaseOrders from "./modules/admin/AdminPurchaseOrders";
import AdminInventoryTransactions from "./modules/admin/AdminInventoryTransactions";
import AdminCategories from "./modules/admin/AdminCategories";
import AdminServiceBom from "./modules/admin/AdminServiceBom";
import AdminUsers from "./modules/admin/AdminUsers";
import AdminCustomerVehicles from "./modules/admin/AdminCustomerVehicles";
import AdminBookings from "./modules/admin/AdminBookings";
import AdminBilling from "./modules/admin/AdminBilling";
import AdminStaff from "./modules/admin/AdminStaff";
import AdminStaffSchedule from "./modules/admin/AdminStaffSchedule";
import AdminWorkShifts from "./modules/admin/AdminWorkShifts";
import AdminScheduleBoard from "./modules/admin/AdminScheduleBoard";
import AdminWorkOrders from "./modules/admin/AdminWorkOrders";
import TechnicianWorkOrders from "./modules/admin/TechnicianWorkOrders";
import AdminPermissions from "./modules/admin/AdminPermissions";
import AdminRoles from "./modules/admin/AdminRoles";
import AdminNotificationTemplates from "./modules/admin/AdminNotificationTemplates";

// Đồng bộ phiên từ token lưu sẵn ở localStorage trước khi render.
// Nếu token đã hết hạn, `client.ts` tự refresh; nếu refresh hỏng thì phiên bị xoá
// và RequireAuth chuyển hướng về /login.
hydrateUser().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      {/* BrowserRouter đặt TRÊN ErrorBoundary: nếu lỗi xảy ra trong route,
          ErrorPage vẫn dùng được <Link> mà không bị crash lần nữa. */}
      <BrowserRouter>
        <ErrorBoundary
          onError={(error, info) => {
            // eslint-disable-next-line no-console
            console.error("[Top-level ErrorBoundary]", error, info);
          }}
        >
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Home />} />

              {/* ============ AUTH module ============ */}
              <Route path="login" element={<Login />} />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />

              {/* ============ COMMERCE module ============ */}
              <Route path="services" element={<ServicesList />} />
              <Route path="services/:slug" element={<ServiceDetail />} />

              {/* ============ AI module ============ */}
              <Route path="ai/damage" element={<DamageUpload />} />
              <Route path="ai/assistant" element={<ChatAssistant />} />

              {/* ============ SEARCH ============ */}
              <Route path="search" element={<SearchPage />} />

              {/* ============ Trang tĩnh ============ */}
              <Route path="help" element={<HelpPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* ============= Admin module (separate layout) ============= */}
            <Route
              path="/admin"
              element={
                <ToastProvider>
                  <AdminLayout />
                </ToastProvider>
              }
            >
              {/*
                Moi route con deu boc `RequireAdmin`:
                  1. `RequireAuth` — bat buoc dang nhap.
                  2. Kiem tra authority theo `config/adminAccess.ts` — hien
                     trang 403 neu role khong duoc phan quyen man hinh nay.

                Luu y: `AdminLayout` KHONG boc RequireAuth de no hien thi
                sidebar/topbar ngay; cac route con tu lo phan bao ve.
              */}
              <Route
                index
                element={
                  <RequireAdmin>
                    <AdminDashboard />
                  </RequireAdmin>
                }
              />
              <Route
                path="services"
                element={
                  <RequireAdmin>
                    <AdminServices />
                  </RequireAdmin>
                }
              />
              <Route
                path="services/bom/:serviceId"
                element={
                  <RequireAdmin>
                    <AdminServiceBom />
                  </RequireAdmin>
                }
              />
              <Route
                path="categories"
                element={
                  <RequireAdmin>
                    <AdminCategories />
                  </RequireAdmin>
                }
              />
              <Route
                path="parts"
                element={
                  <RequireAdmin>
                    <AdminParts />
                  </RequireAdmin>
                }
              />
              <Route
                path="suppliers"
                element={
                  <RequireAdmin>
                    <AdminSuppliers />
                  </RequireAdmin>
                }
              />
              <Route
                path="purchase-orders"
                element={
                  <RequireAdmin>
                    <AdminPurchaseOrders />
                  </RequireAdmin>
                }
              />
              <Route
                path="inventory-transactions"
                element={
                  <RequireAdmin>
                    <AdminInventoryTransactions />
                  </RequireAdmin>
                }
              />
              <Route
                path="bookings"
                element={
                  <RequireAdmin>
                    <AdminBookings />
                  </RequireAdmin>
                }
              />
              <Route
                path="invoices"
                element={
                  <RequireAdmin>
                    <AdminBilling />
                  </RequireAdmin>
                }
              />
              <Route
                path="staff"
                element={
                  <RequireAdmin>
                    <AdminStaff />
                  </RequireAdmin>
                }
              />
              <Route
                path="staff/:staffId/schedule"
                element={
                  <RequireAdmin>
                    <AdminStaffSchedule />
                  </RequireAdmin>
                }
              />
              <Route
                path="work-shifts"
                element={
                  <RequireAdmin>
                    <AdminWorkShifts />
                  </RequireAdmin>
                }
              />
              <Route
                path="schedule"
                element={
                  <RequireAdmin>
                    <AdminScheduleBoard />
                  </RequireAdmin>
                }
              />
              <Route
                path="work-orders"
                element={
                  <RequireAdmin>
                    <AdminWorkOrders />
                  </RequireAdmin>
                }
              />
              <Route
                path="work-orders/mine"
                element={
                  <RequireAdmin>
                    <TechnicianWorkOrders />
                  </RequireAdmin>
                }
              />
              <Route
                path="vehicles"
                element={
                  <RequireAdmin>
                    <AdminCustomerVehicles />
                  </RequireAdmin>
                }
              />
              <Route
                path="users"
                element={
                  <RequireAdmin>
                    <AdminUsers />
                  </RequireAdmin>
                }
              />
              <Route
                path="permissions"
                element={
                  <RequireAdmin>
                    <AdminPermissions />
                  </RequireAdmin>
                }
              />
              <Route
                path="roles"
                element={
                  <RequireAdmin>
                    <AdminRoles />
                  </RequireAdmin>
                }
              />
              <Route
                path="notification-templates"
                element={
                  <RequireAdmin>
                    <AdminNotificationTemplates />
                  </RequireAdmin>
                }
              />
              <Route
                path="reports"
                element={
                  <RequireAdmin>
                    <ComingSoon
                      title="Báo cáo & Thống kê"
                      desc="Module báo cáo đang được phát triển. Sẽ bao gồm: doanh thu theo dịch vụ, hiệu suất kỹ thuật viên, cohort khách hàng..."
                    />
                  </RequireAdmin>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireAdmin>
                    <ComingSoon
                      title="Cài đặt hệ thống"
                      desc="Cấu hình chung: thông tin công ty, email templates, payment gateway, backup..."
                    />
                  </RequireAdmin>
                }
              />
              <Route path="*" element={<AdminNotFound />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>,
  );
});

// =========================
// Admin placeholder pages
// =========================

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card hover={false}>
        <div className="p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <IconSparkles size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-ink-muted mb-6">{desc}</p>
          <Link to="/admin">
            <Button variant="outline">
              <IconArrowLeft size={14} />
              Quay lại Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card hover={false}>
        <div className="p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-bgsoft text-ink-muted flex items-center justify-center mx-auto mb-4">
            <IconSettings size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Trang không tồn tại</h2>
          <p className="text-sm text-ink-muted mb-6">
            Đường dẫn admin không hợp lệ hoặc đang được phát triển.
          </p>
          <Link to="/admin">
            <Button>
              <IconArrowLeft size={14} />
              Về Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
