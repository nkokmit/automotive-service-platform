import { Link } from "react-router-dom";
import { IconCar } from "./icons";

export default function Footer() {
  return (
    <footer className="bg-bgsoft border-t border-ink/8 mt-16">
      <div className="container-page py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg text-primary mb-3">
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
              <IconCar size={20} />
            </span>
            AutoCare
          </div>
          <p className="text-sm text-ink-light leading-relaxed">
            Nền tảng kết nối garage uy tín với chủ xe. Tìm kiếm, đặt lịch và
            chăm sóc xe dễ dàng.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Dịch vụ</h4>
          <ul className="space-y-2 text-sm text-ink-light">
            <li>
              <Link to="/services" className="hover:text-primary">
                Tìm dịch vụ
              </Link>
            </li>
            <li>
              <Link to="/ai/damage" className="hover:text-primary">
                Phân tích hư hỏng
              </Link>
            </li>
            <li>
              <Link to="/ai/assistant" className="hover:text-primary">
                Trợ lý AI
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Hỗ trợ</h4>
          <ul className="space-y-2 text-sm text-ink-light">
            <li>Trung tâm trợ giúp</li>
            <li>Điều khoản sử dụng</li>
            <li>Chính sách bảo mật</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Liên hệ</h4>
          <ul className="space-y-2 text-sm text-ink-light">
            <li>Email: support@autocare.vn</li>
            <li>Hotline: 1900 6868</li>
            <li>TP.HCM, Việt Nam</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/8 py-4">
        <div className="container-page text-center text-xs text-ink-muted">
          © 2026 AutoCare. Đồ án tốt nghiệp — Nhóm 3.
        </div>
      </div>
    </footer>
  );
}