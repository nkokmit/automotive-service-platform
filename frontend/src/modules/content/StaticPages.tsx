/**
 * 3 trang tĩnh: Trung tâm trợ giúp, Điều khoản sử dụng, Chính sách bảo mật.
 * Nội dung là bản mẫu — cần cập nhật theo pháp lý thực tế của doanh nghiệp.
 */
import { Link } from "react-router-dom";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { GARAGE } from "../../config/garage";
import { IconChat, IconPhone, IconMail, IconMapPin } from "../../components/icons";

const UPDATED_AT = "01/11/2026";

// =========================
// Trung tâm trợ giúp
// =========================

const FAQS = [
  {
    q: "Làm sao để đặt lịch sửa chữa?",
    a: "Vào mục “Đặt lịch sửa chữa”, chọn dịch vụ bạn cần, chọn ngày giờ còn trống rồi xác nhận. Bạn sẽ nhận được trạng thái lịch hẹn trong mục Tài khoản của tôi.",
  },
  {
    q: "Tôi có thể theo dõi lịch sử bảo dưỡng không?",
    a: "Có. Sau khi đăng nhập, mở Tài khoản của tôi → tab “Lịch sử bảo dưỡng” để xem toàn bộ lần sửa chữa đã thực hiện tại xưởng.",
  },
  {
    q: "Tôi có thể xem định mức phụ tùng của dịch vụ không?",
    a: "Có. Mở trang chi tiết dịch vụ, cuộn xuống mục “Định mức phụ tùng đi kèm” để xem linh kiện xưởng dự kiến dùng cho dịch vụ đó.",
  },
  {
    q: "Tôi có thể đánh giá dịch vụ sau khi sửa xe không?",
    a: "Có. Mở trang chi tiết dịch vụ, kéo xuống mục “Đánh giá” để gửi nhận xét và điểm số của bạn.",
  },
  {
    q: "Hệ thống có hỗ trợ chẩn đoán hư hỏng bằng AI không?",
    a: "Có. Mục AI → “Phân tích hư hỏng” cho phép tải ảnh hư hỏng và nhận gợi ý sơ bộ. Kết quả chỉ mang tính tham khảo, kỹ thuật viên sẽ kiểm tra trực tiếp.",
  },
  {
    q: "Tôi quên mật khẩu thì làm sao?",
    a: "Liên hệ hotline hoặc email hỗ trợ, chúng tôi sẽ gửi liên kết đặt lại mật khẩu tới email của bạn.",
  },
];

export function HelpPage() {
  return (
    <StaticShell
      title="Trung tâm trợ giúp"
      subtitle="Câu trả lời nhanh cho các vấn đề thường gặp khi sử dụng AutoCare."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* FAQ */}
        <div className="lg:col-span-2 space-y-3">
          {FAQS.map((f) => (
            <Card key={f.q}>
              <details className="group p-5">
                <summary className="flex items-center justify-between gap-3 cursor-pointer font-semibold text-ink list-none">
                  {f.q}
                  <span className="text-ink-muted group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-ink-light leading-relaxed">
                  {f.a}
                </p>
              </details>
            </Card>
          ))}
        </div>

        {/* Liên hệ */}
        <div className="space-y-4">
          <Card>
            <div className="p-5">
              <h2 className="font-bold text-ink mb-3">Liên hệ hỗ trợ</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <IconPhone size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-ink-muted">Hotline</div>
                    <a
                      href={`tel:${GARAGE.hotline.replace(/\s/g, "")}`}
                      className="font-medium text-ink hover:text-primary"
                    >
                      {GARAGE.hotline}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <IconMail size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-ink-muted">Email</div>
                    <a
                      href={`mailto:${GARAGE.email}`}
                      className="font-medium text-ink hover:text-primary break-all"
                    >
                      {GARAGE.email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <IconMapPin size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-ink-muted">Địa chỉ xưởng</div>
                    <div className="font-medium text-ink">{GARAGE.address}</div>
                  </div>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-ink/8">
                <Link to="/ai/assistant">
                  <Button variant="outline" fullWidth>
                    <IconChat size={16} /> Chat với trợ lý AI
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h2 className="font-bold text-ink mb-2">Giờ làm việc</h2>
              <p className="text-sm text-ink-light">
                T2 – T7: 08:00 – 18:00
                <br />
                CN: 08:00 – 12:00
              </p>
            </div>
          </Card>
        </div>
      </div>
    </StaticShell>
  );
}

// =========================
// Điều khoản sử dụng
// =========================

const TERMS_SECTIONS = [
  {
    title: "1. Điều khoản chung",
    body: "Việc sử dụng website và các dịch vụ của AutoCare đồng nghĩa với việc bạn chấp nhận các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.",
  },
  {
    title: "2. Tài khoản người dùng",
    body: "Bạn chịu trách nhiệm giữ mật khẩu bí mật và chịu trách nhiệm cho mọi hoạt động dưới tài khoản của mình. Vui lòng thông báo ngay cho chúng tôi khi phát hiện dấu hiệu truy cập trái phép.",
  },
  {
    title: "3. Dịch vụ bảo dưỡng và sửa chữa",
    body: "Báo giá trên website mang tính tham khảo. Giá thực tế có thể thay đổi tuỳ tình trạng xe sau khi kỹ thuật viên kiểm tra. Chúng tôi sẽ thông báo và xin sự đồng ý của bạn trước khi thực hiện các hạng mục phát sinh ngoài phạm vi đã thống nhất.",
  },
  {
    title: "4. Đặt lịch và huỷ lịch",
    body: "Vui lòng huỷ hoặc đổi lịch trước ít nhất 24 giờ để xưởng sắp xếp lại. Các trường hợp không thông báo trước có thể bị tính phí theo chính sách riêng của từng dịch vụ.",
  },
  {
    title: "5. Linh kiện thay thế",
    body: "Linh kiện dùng cho quá trình sửa chữa đều là sản phẩm chính hãng, có bảo hành từ nhà sản xuất. Bạn có thể xem định mức linh kiện dự kiến trên từng trang dịch vụ.",
  },
  {
    title: "6. Trách nhiệm của khách hàng",
    body: "Khách hàng chịu trách nhiệm kiểm tra thông tin lịch hẹn, hồ sơ xe và các dữ liệu cung cấp cho xưởng. AutoCare không chịu trách nhiệm đối với thiệt hại phát sinh do thông tin sai lệch hoặc do khách hàng che giấu tình trạng thực tế của xe.",
  },
  {
    title: "7. Bảo lưu quyền",
    body: "Chúng tôi có quyền cập nhật, sửa đổi hoặc ngừng cung cấp bất kỳ chức năng nào nếu thấy cần thiết cho vận hành hoặc tuân thủ quy định pháp luật.",
  },
  {
    title: "8. Giới hạn trách nhiệm",
    body: "AutoCare không chịu trách nhiệm đối với các thiệt hại gián tiếp, tổn thất cơ hội hoặc tổn thất phát sinh từ việc sử dụng dịch vụ trong phạm vi được pháp luật cho phép.",
  },
  {
    title: "9. Luật áp dụng",
    body: "Các điều khoản này được điều chỉnh và áp dụng theo pháp luật hiện hành của Việt Nam.",
  },
];

export function TermsPage() {
  return (
    <StaticShell
      title="Điều khoản sử dụng"
      subtitle="Cập nhật lần cuối: "
      updatedAt={UPDATED_AT}
    >
      <Card>
        <div className="p-6 md:p-8 space-y-5">
          {TERMS_SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-bold text-ink mb-1.5">{s.title}</h2>
              <p className="text-sm text-ink-light leading-relaxed">{s.body}</p>
            </section>
          ))}

          <div className="pt-4 border-t border-ink/8 flex flex-wrap items-center gap-3">
            <Link to="/help">
              <Button variant="outline">Trung tâm trợ giúp</Button>
            </Link>
            <Link to="/privacy">
              <Button variant="ghost">Chính sách bảo mật</Button>
            </Link>
          </div>
        </div>
      </Card>
    </StaticShell>
  );
}

// =========================
// Chính sách bảo mật
// =========================

const PRIVACY_SECTIONS = [
  {
    title: "1. Thông tin chúng tôi thu thập",
    body: "Họ tên, số điện thoại, email, địa chỉ, thông tin xe (biển số, hãng, model, năm, số km) và lịch sử tương tác với dịch vụ.",
  },
  {
    title: "2. Mục đích sử dụng",
    body: "Xử lý đặt lịch sửa chữa, quản lý hồ sơ xe, gửi hóa đơn, hỗ trợ khách hàng, gửi thông báo khuyến mãi khi bạn đồng ý và cải thiện chất lượng dịch vụ.",
  },
  {
    title: "3. Chia sẻ dữ liệu",
    body: "Chúng tôi không bán dữ liệu cá nhân của bạn. Dữ liệu chỉ được chia sẻ với đối tác kỹ thuật phục vụ trực tiếp cho lịch hẹn và hồ sơ xe của bạn, hoặc khi có yêu cầu hợp pháp.",
  },
  {
    title: "4. Lưu trữ và bảo mật",
    body: "Mật khẩu được lưu dưới dạng mã hoá không thể đảo ngược. Chúng tôi áp dụng các biện pháp kiểm soát truy cập, sao lưu định kỳ và giám sát hệ thống để bảo vệ dữ liệu.",
  },
  {
    title: "5. Cookie",
    body: "Website sử dụng cookie để duy trì phiên đăng nhập và ghi nhớ lựa chọn của bạn. Bạn có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số chức năng có thể không hoạt động.",
  },
  {
    title: "6. Quyền của bạn",
    body: "Bạn có quyền xem, chỉnh sửa, yêu cầu xoá dữ liệu cá nhân và rút lại sự đồng ý xử lý bất kỉ lúc nào. Liên hệ email hỗ trợ để thực hiện các yêu cầu này.",
  },
  {
    title: "7. Quyền được truy cập",
    body: "Bạn có thể tải bản sao dữ liệu cá nhân của mình dưới dạng file, hoặc chỉnh sửa thông tin trong mục Tài khoản của tôi → Hồ sơ.",
  },
  {
    title: "8. Thay đổi chính sách",
    body: "Chính sách có thể được cập nhật theo thời gian. Mọi thay đổi quan trọng sẽ được thông báo qua website hoặc email.",
  },
];

export function PrivacyPage() {
  return (
    <StaticShell
      title="Chính sách bảo mật"
      subtitle="Cập nhật lần cuối: "
      updatedAt={UPDATED_AT}
    >
      <Card>
        <div className="p-6 md:p-8 space-y-5">
          {PRIVACY_SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-bold text-ink mb-1.5">{s.title}</h2>
              <p className="text-sm text-ink-light leading-relaxed">{s.body}</p>
            </section>
          ))}

          <div className="pt-4 border-t border-ink/8 flex flex-wrap items-center gap-3">
            <Link to="/help">
              <Button variant="outline">Trung tâm trợ giúp</Button>
            </Link>
            <Link to="/terms">
              <Button variant="ghost">Điều khoản sử dụng</Button>
            </Link>
          </div>
        </div>
      </Card>
    </StaticShell>
  );
}

// =========================
// Shell dùng chung
// =========================

function StaticShell({
  title,
  subtitle,
  updatedAt,
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-6 md:py-10">
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">{title}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-ink-muted mb-6">
        {subtitle}
        {updatedAt && (
          <span className="ml-1 font-medium text-ink">{updatedAt}</span>
        )}
      </p>

      {children}
    </div>
  );
}
