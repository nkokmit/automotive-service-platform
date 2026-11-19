import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ToastProvider } from "./components/Toast";
import { CatalogProvider } from "./data/catalog";

export default function App() {
  return (
    <ToastProvider>
      {/* CatalogProvider: nạp dịch vụ/phụ tùng từ inventory-service,
          tự fallback về dữ liệu mẫu nếu API lỗi. */}
      <CatalogProvider>
        <div className="min-h-screen flex flex-col bg-white">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </CatalogProvider>
    </ToastProvider>
  );
}
