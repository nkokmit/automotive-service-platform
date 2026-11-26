/**
 * Hồ sơ garage — nguồn dữ liệu DUY NHẤT cho thông tin gara của web.
 *
 * Trước đây web là marketplace đa garage: mỗi dịch vụ mang `provider.city`,
 * `provider.rating`… và trang list có bộ lọc "Khu vực". Nay web phục vụ
 * đúng MỘT xưởng sửa chữa — "AutoCare Workshop" — nên toàn bộ thông tin
 * nhà xưởng gom về đây để UI chỉ cần import một chỗ.
 *
 * Backend hiện KHÔNG có bảng `garage` (đã kiểm tra: booking-service,
 * staff-service, inventory-service, work-order-service đều không có
 * `garageId`). Vì vậy hồ sơ này là hằng số phía frontend, không đồng bộ DB.
 * Khi backend có bảng garage, chỉ cần thay `GARAGE` bằng API call.
 */

export interface GarageProfile {
  /** Tên hiển thị đầy đủ. */
  name: string;
  /** Tên thương hiệu (logo, tiêu đề tab). */
  brand: string;
  /** Mô tả ngắn — dùng ở hero, meta description. */
  tagline: string;
  /** Mô tả dài — dùng ở trang giới thiệu / footer. */
  description: string;

  address: string;
  city: string;
  district: string;
  phone: string;
  hotline: string;
  email: string;

  /** Giờ mở cửa (dạng hiển thị). */
  workingHours: string;
  /** Giờ mở cửa ngắn — dùng cho header card. */
  workingHoursShort: string;
  /** Số kỹ thuật viên tại xưởng. */
  technicians: number;
  /** Số bãi sửa chữa. */
  bays: number;
  /** Số năm hoạt động. */
  yearsActive: number;

  rating: number;
  reviewsCount: number;

  amenities: string[];
  /** Ảnh đại diện xưởng. */
  image: string;
  gallery: string[];

  /** Link bản đồ (Google Maps) — mở ở tab mới. */
  mapUrl: string;
  /** Link gọi nhanh. */
  telHref: string;
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=70`;

export const GARAGE: GarageProfile = {
  name: "AutoCare Workshop",
  brand: "AutoCare",
  tagline: "Xưởng sửa chữa ô tô chuyên nghiệp tại Hà Nội",
  description:
    "AutoCare Workshop là xưởng bảo dưỡng và sửa chữa ô tô chuyên nghiệp với đội ngũ kỹ thuật viên hơn 10 năm kinh nghiệm. Chúng tôi cam kết phụ tùng chính hãng, báo giá minh bạch và bảo hành rõ ràng trên mọi dịch vụ.",

  address: "128 Nguyễn Văn Cừ, Phường Ngọc Lâm",
  city: "Hà Nội",
  district: "Quận Long Biên",
  phone: "024 3876 1234",
  hotline: "1900 6868",
  email: "support@autocare.vn",

  workingHours: "08:00 - 19:00 (T2 - CN)",
  workingHoursShort: "08:00 - 19:00",
  technicians: 8,
  bays: 6,
  yearsActive: 11,

  rating: 4.8,
  reviewsCount: 234,

  amenities: [
    "Wifi miễn phí",
    "Phòng chờ máy lạnh",
    "Cà phê miễn phí",
    "Camera an ninh",
    "Chỗ đậu xe rộng",
    "Wi-Fi phục vụ cà phê",
  ],

  image: IMG("photo-1486006920555-c77dcf18193c"),
  gallery: [
    IMG("photo-1486006920555-c77dcf18193c"),
    IMG("photo-1632823471565-1ecdf5c6da77"),
    IMG("photo-1492144534655-ae79c964c9d7"),
  ],

  mapUrl: "https://maps.google.com/?q=128+Nguyen+Van+Cu+Long+Bien+Ha+Noi",
  telHref: "tel:02438761234",
};

/**
 * Ảnh placeholder theo nhóm dịch vụ — backend chưa trả field `image` cho
 * service/part nên catalog thật cần ảnh dự phòng cho tới khi có media service.
 */
export const SERVICE_IMAGE_FALLBACK = IMG("photo-1487754180451-c456f719a1fc");

export const PART_IMAGE_FALLBACK: Record<string, string> = {
  "Lốp xe": IMG("photo-1568844293986-8d0400bd4745"),
  "Ắc quy": IMG("photo-1620714223084-8fcacc6dfd75"),
  "Dầu nhớt": IMG("photo-1632823471565-1ecdf5c6da77"),
  "Lọc dầu / Lọc gió": IMG("photo-1487754180451-c456f719a1fc"),
  "Đèn / Pha": IMG("photo-1493238792000-8113da705763"),
  "Nội thất": IMG("photo-1549399542-7e3f8b79c341"),
  "Phụ kiện ngoại thất": IMG("photo-1593941707882-a5bba14938c7"),
  "Phanh": IMG("photo-1486006920555-c77dcf18193c"),
};

export const PART_IMAGE_DEFAULT = IMG("photo-1487754180451-c456f719a1fc");

/** Ảnh dự phòng cho phụ tùng theo tên nhóm (khớp case-insensitive). */
export function partImageFor(category?: string | null): string {
  if (!category) return PART_IMAGE_DEFAULT;
  const direct = PART_IMAGE_FALLBACK[category];
  if (direct) return direct;
  const key = Object.keys(PART_IMAGE_FALLBACK).find(
    (k) => k.toLowerCase() === category.trim().toLowerCase(),
  );
  return key ? PART_IMAGE_FALLBACK[key] : PART_IMAGE_DEFAULT;
}
