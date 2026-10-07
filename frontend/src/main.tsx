import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";

// Auth module
import Login from "./modules/auth/Login";
import Profile from "./modules/auth/Profile";

// Commerce module (cars / parts / cart / services)
import CarsList from "./modules/commerce/CarsList";
import CarDetail from "./modules/commerce/CarDetail";
import PartsList from "./modules/commerce/PartsList";
import PartDetail from "./modules/commerce/PartDetail";
import Cart from "./modules/commerce/Cart";
import Checkout from "./modules/commerce/Checkout";
import ServicesList from "./modules/commerce/ServicesList";
import ServiceDetail from "./modules/commerce/ServiceDetail";

// AI module
import DamageUpload from "./modules/ai/DamageUpload";
import ChatAssistant from "./modules/ai/ChatAssistant";

// Content module (news/articles)
import NewsList from "./modules/content/NewsList";
import ArticleDetail from "./modules/content/ArticleDetail";

// Demo pages (sẽ xoá khi lên production)
import FoundationDemo from "./pages/FoundationDemo";
import BoomDemo from "./pages/BoomDemo";

import { ErrorBoundary, NotFoundPage } from "./components/ErrorBoundary";
import AdminLayout from "./components/AdminLayout";
import { ToastProvider } from "./components/Toast";
import Card from "./components/Card";
import Button from "./components/Button";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconSparkles, IconSettings } from "./components/icons";
import "./styles/globals.css";

import AdminDashboard from "./modules/admin/AdminDashboard";
import AdminGarages from "./modules/admin/AdminGarages";
import AdminServices from "./modules/admin/AdminServices";
import AdminParts from "./modules/admin/AdminParts";
import AdminOrders from "./modules/admin/AdminOrders";
import AdminUsers from "./modules/admin/AdminUsers";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, info) => {
        // eslint-disable-next-line no-console
        console.error("[Top-level ErrorBoundary]", error, info);
        // TODO: gửi lên Sentry / log server khi tích hợp
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />

            {/* ============ AUTH module ============ */}
            <Route path="login" element={<Login />} />
            <Route path="profile" element={<Profile />} />

            {/* ============ COMMERCE module ============ */}
            <Route path="cars" element={<CarsList />} />
            <Route path="cars/:slug" element={<CarDetail />} />
            <Route path="parts" element={<PartsList />} />
            <Route path="parts/:slug" element={<PartDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="services" element={<ServicesList />} />
            <Route path="services/:slug" element={<ServiceDetail />} />

            {/* ============ AI module ============ */}
            <Route path="ai/damage" element={<DamageUpload />} />
            <Route path="ai/assistant" element={<ChatAssistant />} />

            {/* ============ CONTENT module ============ */}
            <Route path="news" element={<NewsList />} />
            <Route path="news/:slug" element={<ArticleDetail />} />

            {/* Demo pages — sẽ xoá ở production */}
            <Route
              path="foundation"
              element={<FoundationDemo />}
            />
            <Route
              path="boom-demo"
              element={<BoomDemo />}
            />

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
            <Route index element={<AdminDashboard />} />
            <Route path="garages" element={<AdminGarages />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="parts" element={<AdminParts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route
              path="reports"
              element={
                <ComingSoon
                  title="Báo cáo & Thống kê"
                  desc="Module báo cáo đang được phát triển. Sẽ bao gồm: doanh thu theo garage, hiệu suất dịch vụ, cohort khách hàng..."
                />
              }
            />
            <Route
              path="settings"
              element={
                <ComingSoon
                  title="Cài đặt hệ thống"
                  desc="Cấu hình chung: thông tin công ty, email templates, payment gateway, backup..."
                />
              }
            />
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

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