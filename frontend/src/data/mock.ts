import type { CatalogPart, CatalogService } from "./catalogTypes";
/**
 * Dữ liệu mẫu — chỉ dùng làm FALLBACK khi API thật lỗi, và cho các phần
 * chưa có backend.
 *
 * KHÔNG dùng file này làm nguồn dữ liệu chính cho dịch vụ / phụ tùng:
 * xem `data/catalog.tsx` (đọc từ inventory-service).
 */

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=70`;

// =========================
// CATALOG FALLBACK (dịch vụ)
// =========================
// Dùng khi inventory-service không truy cập được. Giữ đúng shape của
// `CatalogService` để `data/catalog.tsx` có thể thay thế trong lúc chạy.
export const mockServices: CatalogService[] = [
  {
    id: "sv1",
    slug: "thay-dau-dong-co",
    code: "SV-OIL-CHANGE",
    name: "Thay dầu động cơ",
    description:
      "Thay dầu nhớt chính hãng các loại, kèm lọc dầu. Áp dụng cho xe xăng và diesel, động cơ 1.5L - 3.5L.",
    category: "Bảo dưỡng",
    categoryId: "cat-bao-duong",
    durationMin: 30,
    requiredTechs: 1,
    priceFrom: 350000,
    priceTo: 800000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    warrantyMonths: 1,
    includes: [
      "Thay dầu nhớt chính hãng theo chỉ định",
      "Thay lọc dầu mới",
      "Kiểm tra mức dầu sau khi thay",
      "Vệ sinh khoang máy cơ bản",
    ],
    requirements: [
      "Mang theo sổ bảo hành (nếu có)",
      "Xe còn ít nhất 1/4 bình xăng để chạy thử",
    ],
    isPopular: true,
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 120,
    bookingsCount: 1205,
  },
  {
    id: "sv2",
    slug: "bao-duong-10k",
    code: "SV-PERIODIC-10K",
    name: "Bảo dưỡng định kỳ 10.000 km",
    description:
      "Kiểm tra tổng quát 27 hạng mục, thay dầu, lọc dầu, lọc gió, kiểm tra phanh, lốp, ắc quy, đèn chiếu sáng.",
    category: "Bảo dưỡng",
    categoryId: "cat-bao-duong",
    durationMin: 120,
    requiredTechs: 2,
    priceFrom: 1200000,
    priceTo: 2500000,
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    warrantyMonths: 3,
    includes: [
      "Thay dầu động cơ + lọc dầu",
      "Thay lọc gió động cơ + lọc gió điều hòa",
      "Kiểm tra 27 hạng mục: phanh, lốp, ắc quy, đèn, kính, gạt mưa...",
      "Vệ sinh buồng đốt (nếu cần)",
      "Cập nhật sổ bảo dưỡng định kỳ",
    ],
    requirements: [
      "Nên đặt lịch trước 1-2 ngày",
      "Xe không nên chở hàng cồng kềnh",
    ],
    isPopular: true,
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 85,
    bookingsCount: 845,
  },
  {
    id: "sv3",
    slug: "son-xe-1-chi-tiet",
    code: "SV-PAINT-DETAIL",
    name: "Sơn xe 1 chi tiết (cánh cửa, nắp capo...)",
    description:
      "Sơn, đánh bóng 1 chi tiết thân vỏ bằng sơn chính hãng, phòng sơn kín đảm bảo chất lượng.",
    category: "Sơn & thân vỏ",
    categoryId: "cat-son-than-vo",
    durationMin: 240,
    requiredTechs: 2,
    priceFrom: 2500000,
    priceTo: 4500000,
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    warrantyMonths: 12,
    includes: [
      "Sơn chính hãng theo mã màu xe",
      "Đánh bóng bề mặt sau sơn",
      "Sấy khô trong phòng sơn kín",
      "Bảo hành 12 tháng không bong tróc",
    ],
    requirements: [
      "Mang theo giấy tờ xe (để tra mã màu)",
      "Nên để xe 1 ngày để sơn khô hoàn toàn",
    ],
    isPopular: false,
    isFeatured: true,
    rating: 4.7,
    reviewsCount: 31,
    bookingsCount: 312,
  },
  {
    id: "sv4",
    slug: "ve-sinh-kim-phun",
    code: "SV-ULTRASONIC-CLEAN",
    name: "Vệ sinh kim phun, buồng đốt",
    description:
      "Vệ sinh kim phun bằng máy siêu âm chuyên dụng, làm sạch muội than buồng đốt, giúp xe vận hành mượt mà.",
    category: "Bảo dưỡng",
    categoryId: "cat-bao-duong",
    durationMin: 90,
    requiredTechs: 1,
    priceFrom: 800000,
    priceTo: 1500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    warrantyMonths: 2,
    includes: [
      "Vệ sinh kim phun bằng máy siêu âm chuyên dụng",
      "Làm sạch muội than buồng đốt",
      "Kiểm tra và reset hệ thống",
      "Chạy thử, đánh giá hiệu quả",
    ],
    requirements: [],
    isPopular: false,
    isFeatured: false,
    rating: 4.6,
    reviewsCount: 20,
    bookingsCount: 198,
  },
  {
    id: "sv5",
    slug: "thay-ma-phanh",
    code: "SV-BRAKE-PAD",
    name: "Thay má phanh trước/sau",
    description:
      "Thay má phanh chính hãng, kiểm tra đĩa phanh, xảy dầu phanh. Áp dụng cho các dòng xe phổ thông.",
    category: "Lốp & phanh",
    categoryId: "cat-lop-phanh",
    durationMin: 60,
    requiredTechs: 1,
    priceFrom: 1500000,
    priceTo: 3500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    warrantyMonths: 6,
    includes: [
      "Thay má phanh chính hãng (trước hoặc sau)",
      "Kiểm tra đĩa phanh, cảnh báo mòn",
      "Xảy dầu phanh cũ, thay dầu phanh mới",
      "Chạy thử, kiểm tra lực phanh",
    ],
    requirements: [],
    isPopular: true,
    isFeatured: false,
    rating: 4.7,
    reviewsCount: 28,
    bookingsCount: 276,
  },
  {
    id: "sv6",
    slug: "nap-may-dieu-hoa",
    code: "SV-AC-CHARGE",
    name: "Nạp gas điều hòa + vệ sinh",
    description:
      "Nạp gas R134a/R1234yf, vệ sinh dàn lạnh, lọc gió điều hòa, kiểm tra áp suất gas. Phù hợp mọi dòng xe.",
    category: "Điện - Điều hòa",
    categoryId: "cat-dien-dieu-hoa",
    durationMin: 45,
    requiredTechs: 1,
    priceFrom: 400000,
    priceTo: 800000,
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    warrantyMonths: 3,
    includes: [
      "Nạp gas R134a hoặc R1234yf theo xe",
      "Vệ sinh dàn lạnh, lọc gió điều hòa",
      "Kiểm tra áp suất gas, rò rỉ",
      "Vệ sinh quạt gió nếu cần",
    ],
    requirements: [],
    isPopular: true,
    isFeatured: false,
    rating: 4.8,
    reviewsCount: 42,
    bookingsCount: 423,
  },
  {
    id: "sv7",
    slug: "thay-ac-quy",
    code: "SV-BATTERY",
    name: "Thay ắc quy ô tô",
    description:
      "Thay ắc quy chính hãng GS, Đồng Nai, Varta. Kiểm tra hệ thống sạc, cài đặt lại các thiết bị điện tử.",
    category: "Điện - Điều hòa",
    categoryId: "cat-dien-dieu-hoa",
    durationMin: 20,
    requiredTechs: 1,
    priceFrom: 1200000,
    priceTo: 3500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    warrantyMonths: 18,
    includes: [
      "Ắc quy chính hãng theo dung lượng yêu cầu",
      "Lắp đặt, kiểm tra hệ thống sạc",
      "Cài đặt lại các thiết bị điện tử (radio, đồng hồ...)",
      "Bảo hành 18 tháng theo nhà sản xuất",
    ],
    requirements: [],
    isPopular: false,
    isFeatured: false,
    rating: 4.7,
    reviewsCount: 20,
    bookingsCount: 198,
  },
  {
    id: "sv8",
    slug: "thay-lop-o-to",
    code: "SV-TYRE-CHANGE",
    name: "Thay lốp ô tô (4 lốp)",
    description:
      "Cung cấp các thương hiệu Michelin, Bridgestone, Continental, Kumho. Cân chỉnh độ chụm sau khi thay.",
    category: "Lốp & phanh",
    categoryId: "cat-lop-phanh",
    durationMin: 90,
    requiredTechs: 2,
    priceFrom: 4000000,
    priceTo: 12000000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    warrantyMonths: 6,
    includes: [
      "4 lốp chính hãng theo kích thước xe",
      "Tháo lắp, cân chỉnh độ chụm",
      "Cân bằng lốp, kiểm tra áp suất",
      "Bảo hành theo nhà sản xuất lốp",
    ],
    requirements: [],
    isPopular: false,
    isFeatured: false,
    rating: 4.6,
    reviewsCount: 15,
    bookingsCount: 145,
  },
];

// =========================
// PARTS / ACCESSORIES (mock — dùng cho Commerce Service ở production)
// =========================
// CATALOG FALLBACK (phụ tùng)
// =========================
// Dùng khi inventory-service không truy cập được. Giữ đúng shape của
// `CatalogPart` để `data/catalog.tsx` có thể thay thế trong lúc chạy.
export const mockParts: CatalogPart[] = [
  {
    id: "pt1",
    slug: "lop-michelin-primacy-4-205-55r16",
    sku: "TYR-MIC-2055516",
    name: "Lốp Michelin Primacy 4 205/55R16",
    brand: "Michelin",
    category: "Lốp xe",
    categoryId: "cat-lop-xe",
    unit: "Cái",
    priceVND: 2450000,
    originalPriceVND: 2750000,
    stockQty: 84,
    image: IMG("photo-1568844293986-8d0400bd4745"),
    shortDescription:
      "Lốp du lịch cao cấp, độ bám đường ướt tốt, tuổi thọ 50.000 km.",
    compatibleCars: ["Toyota Vios", "Honda City", "Mazda 3"],
    rating: 4.9,
    reviewsCount: 124,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: "pt2",
    slug: "ac-quy-gs-12v-65ah",
    sku: "BAT-GS-12V65",
    name: "Ắc quy GS 12V 65Ah (MF)",
    brand: "GS",
    category: "Ắc quy",
    categoryId: "cat-ac-quy",
    unit: "Cái",
    priceVND: 1450000,
    stockQty: 56,
    image: IMG("photo-1620714223084-8fcacc6dfd75"),
    shortDescription:
      "Ắc quy khô miễn bảo dưỡng, phù hợp sedan/hatchback phổ thông.",
    compatibleCars: ["Toyota Vios", "Honda City", "Hyundai Accent", "Kia Morning"],
    rating: 4.7,
    reviewsCount: 89,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: "pt3",
    slug: "dau-nhot-castrol-magnatec-10w30",
    sku: "OIL-CAS-10W30-4L",
    name: "Dầu nhớt Castrol Magnatec 10W-30 (4L)",
    brand: "Castrol",
    category: "Dầu nhớt",
    categoryId: "cat-dau-nhot",
    unit: "Can 4L",
    priceVND: 520000,
    originalPriceVND: 580000,
    stockQty: 120,
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    shortDescription:
      "Dầu bán tổng hợp, bảo vệ động cơ ngay từ lúc khởi động.",
    compatibleCars: ["Toyota Vios", "Honda City", "Mazda 3", "Hyundai Accent"],
    rating: 4.8,
    reviewsCount: 156,
    isFeatured: false,
    isBestSeller: true,
  },
  {
    id: "pt4",
    slug: "bo-loc-dau-mahle-oc195",
    sku: "FLT-MAH-OC195",
    name: "Bộ lọc dầu Mahle OC195 (tương thích Toyota/Honda)",
    brand: "Mahle",
    category: "Lọc dầu / Lọc gió",
    categoryId: "cat-loc",
    unit: "Cái",
    priceVND: 95000,
    stockQty: 240,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    shortDescription: "Lọc dầu chính hãng Mahle, chất lượng OE.",
    compatibleCars: ["Toyota", "Honda", "Mazda"],
    rating: 4.7,
    reviewsCount: 78,
    isFeatured: true,
    isBestSeller: false,
  },
  {
    id: "pt5",
    slug: "den-led-philips-ultinon-h7",
    sku: "LGT-PHI-H7",
    name: "Bóng đèn LED Philips Ultinon H7",
    brand: "Philips",
    category: "Đèn / Pha",
    categoryId: "cat-den-pha",
    unit: "Cặp",
    priceVND: 890000,
    originalPriceVND: 1100000,
    stockQty: 65,
    image: IMG("photo-1493238792000-8113da705763"),
    shortDescription:
      "Ánh sáng trắng 6500K, sáng hơn 200% so với halogen thường.",
    compatibleCars: [],
    rating: 4.6,
    reviewsCount: 47,
    isFeatured: false,
    isBestSeller: false,
  },
  {
    id: "pt6",
    slug: "tham-san-3d-kia-morning",
    sku: "ACC-KIA-MAT-3D",
    name: "Thảm sàn 3D cao cấp Kia Morning",
    brand: "OEM",
    category: "Nội thất",
    categoryId: "cat-noi-that",
    unit: "Bộ",
    priceVND: 850000,
    stockQty: 38,
    image: IMG("photo-1549399542-7e3f8b79c341"),
    shortDescription: "Thảm sàn 3D chống trượt, ôm sàn chuẩn xe, dễ vệ sinh.",
    compatibleCars: ["Kia Morning"],
    rating: 4.4,
    reviewsCount: 22,
    isFeatured: false,
    isBestSeller: false,
  },
  {
    id: "pt7",
    slug: "camera-hanh-trinh-viofo-a119-v3",
    sku: "CAM-VIO-A119V3",
    name: "Camera hành trình Viofo A119 V3",
    brand: "Viofo",
    category: "Phụ kiện ngoại thất",
    categoryId: "cat-phu-kien-ngoai-that",
    unit: "Cái",
    priceVND: 2350000,
    stockQty: 28,
    image: IMG("photo-1593941707882-a5bba14938c7"),
    shortDescription:
      "Camera hành trình 2K, GPS tích hợp, ghi hình trước sau.",
    compatibleCars: [],
    rating: 4.8,
    reviewsCount: 64,
    isFeatured: true,
    isBestSeller: false,
  },
  {
    id: "pt8",
    slug: "bo-ma-phanh-brembo-truoc",
    sku: "BRK-BRE-CER-F",
    name: "Bộ má phanh Brembo trước (Ceramic)",
    brand: "Brembo",
    category: "Phanh",
    categoryId: "cat-phanh",
    unit: "Bộ",
    priceVND: 2890000,
    originalPriceVND: 3200000,
    stockQty: 32,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    shortDescription:
      "Má phanh Brembo ceramic, phanh nhạy, bền, không bám bụi.",
    compatibleCars: [],
    rating: 4.9,
    reviewsCount: 91,
    isFeatured: true,
    isBestSeller: true,
  },
];
export const chatSuggestions = [
  "Cách bảo quản xe ô tô khi để lâu ngày không đi?",
  "Nên chọn dầu nhớt 0W-20 hay 5W-30 cho ô tô?",
  "Dấu hiệu nhận biết cần thay má phanh ô tô?",
  "Điều hoà ô tô không mát hoặc có mùi chua thì xử lý sao?",
  "Tra cứu lịch sử bảo dưỡng xe 30F-12345",
];

// =========================
// USERS / VEHICLES
// (dùng cho trang /profile)
// =========================

export interface Vehicle {
  id: string;
  nickname: string; // VD: "Vios gia đình"
  brand: string;
  model: string;
  year: number;
  plate: string; // Biển số
  odoKm: number;
  image: string;
  color?: string;
  lastServiceAt?: string;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  memberSince: string;
  loyaltyPoints: number;
  tier: "Thành viên" | "Bạc" | "Vàng" | "Bạch kim";
  vehicles: Vehicle[];
}

export const mockUsers: MockUser[] = [
  {
    id: "u1",
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    phone: "0901 234 567",
    avatar: IMG("photo-1535713875002-d1d0cf377fde"),
    memberSince: "15/03/2024",
    loyaltyPoints: 1240,
    tier: "Vàng",
    vehicles: [
      {
        id: "v1",
        nickname: "Vios gia đình",
        brand: "Toyota",
        model: "Vios 1.5G",
        year: 2023,
        plate: "30H-123.45",
        odoKm: 18_500,
        image: IMG("photo-1494976388531-d1058494cdd8"),
        color: "Trắng",
        lastServiceAt: "15/09/2026",
      },
      {
        id: "v2",
        nickname: "Morning đi phố",
        brand: "Kia",
        model: "Morning 1.25 AT",
        year: 2021,
        plate: "30H-678.90",
        odoKm: 55_000,
        image: IMG("photo-1471444928139-48c5bf5173e"),
        color: "Đỏ",
        lastServiceAt: "02/07/2026",
      },
    ],
  },
];