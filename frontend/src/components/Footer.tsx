import { Link } from "react-router-dom";
import { IconCar, IconMapPin, IconPhone } from "./icons";
import { GARAGE } from "../config/garage";

export default function Footer() {
  return (
    <footer className="bg-bgsoft border-t border-ink/8 mt-16">
      <div className="container-page py-10 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg text-primary mb-3">
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
              <IconCar size={20} />
            </span>
            {GARAGE.brand}
          </div>
          <p className="text-sm text-ink-light leading-relaxed">
            {GARAGE.description}
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Dịch vụ</h4>
          <ul className="space-y-2 text-sm text-ink-light">
            <li>
              <Link to="/services" className="hover:text-primary">
                Dịch vụ sửa chữa
              </Link>
            </li>
            <li>
              <Link to="/parts" className="hover:text-primary">
                Phụ kiện &amp; phụ tùng
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
            <li className="flex items-start gap-1.5">
              <IconMapPin size={14} className="shrink-0 mt-0.5" />
              <span>
                {GARAGE.address}, {GARAGE.district}, {GARAGE.city}
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <IconPhone size={14} className="shrink-0" />
              <span>
                {GARAGE.hotline} · {GARAGE.phone}
              </span>
            </li>
            <li>Email: {GARAGE.email}</li>
            <li>Giờ mở cửa: {GARAGE.workingHours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/8 py-4">
        <div className="container-page text-center text-xs text-ink-muted">
          © 2026 {GARAGE.name}. Đồ án tốt nghiệp — Nhóm 3.
        </div>
      </div>
    </footer>
  );
}
