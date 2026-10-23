import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ServicesList from "./pages/ServicesList";
import ServiceDetail from "./pages/ServiceDetail";
import DamageUpload from "./pages/DamageUpload";
import ChatAssistant from "./pages/ChatAssistant";
import FoundationDemo from "./pages/FoundationDemo";
import BoomDemo from "./pages/BoomDemo";
import CarsList from "./pages/CarsList";
import CarDetail from "./pages/CarDetail";
import PartsList from "./pages/PartsList";
import PartDetail from "./pages/PartDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NewsList from "./pages/NewsList";
import ArticleDetail from "./pages/ArticleDetail";
import Profile from "./pages/Profile";
import { ErrorBoundary, NotFoundPage } from "./components/ErrorBoundary";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGarages from "./pages/AdminGarages";
import AdminServices from "./pages/AdminServices";
import AdminParts from "./pages/AdminParts";
import AdminOrders from "./pages/AdminOrders";
import AdminUsers from "./pages/AdminUsers";
import { ToastProvider } from "./components/Toast";
import Card from "./components/Card";
import Button from "./components/Button";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconSparkles, IconSettings } from "./components/icons";
import "./styles/globals.css";

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
            <Route path="login" element={<Login />} />
            <Route path="services" element={<ServicesList />} />
            <Route path="services/:slug" element={<ServiceDetail />} />
            <Route path="cars" element={<CarsList />} />
            <Route path="cars/:slug" element={<CarDetail />} />
            <Route path="parts" element={<PartsList />} />
            <Route path="parts/:slug" element={<PartDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="news" element={<NewsList />} />
            <Route path="news/:slug" element={<ArticleDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="ai/damage" element={<DamageUpload />} />
            <Route path="ai/assistant" element={<ChatAssistant />} />
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