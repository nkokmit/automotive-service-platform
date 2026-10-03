export interface Garage {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  priceFrom: number;
  image: string;
  services: string[];
  openNow: boolean;
  isFeatured?: boolean;
  description: string;
  workingHours: string;
  phone: string;
  amenities: string[];
  gallery: string[];
  reviews: Review[];
  serviceMenu: ServiceItem[];
  availability: Record<string, string[]>; // dateISO -> slots
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  durationMin: number;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: "Bảo dưỡng" | "Kiến thức" | "An toàn" | "Mua bán xe" | "Kinh nghiệm";
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  publishedAt: string; // ISO date hoặc DD/MM/YYYY
  readMinutes: number;
  /** Nội dung bài viết dạng các section — render tuần tự. */
  sections: ArticleSection[];
  /** Từ khoá SEO/tags. */
  tags?: string[];
  /** Featured để hiển thị ở top. */
  isFeatured?: boolean;
}

export type ArticleSection =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string; cite?: string }
  | { type: "callout"; tone: "info" | "warning" | "success"; title: string; text: string }
  | { type: "image"; src: string; caption?: string };

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=70`;

export const featuredGarages: Garage[] = [
  {
    id: "g1",
    slug: "garage-minh-anh",
    name: "Garage Minh Anh",
    address: "123 Nguyễn Văn Cừ, P. Ngọc Lâm",
    city: "Hà Nội",
    rating: 4.8,
    reviewsCount: 234,
    distanceKm: 1.2,
    priceFrom: 200000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    services: ["Thay dầu", "Bảo dưỡng", "Sửa chữa tổng quát"],
    openNow: true,
    isFeatured: true,
    description:
      "Garage Minh Anh chuyên bảo dưỡng và sửa chữa xe ô tô các dòng phổ thông. Đội ngũ kỹ thuật viên hơn 10 năm kinh nghiệm.",
    workingHours: "08:00 - 19:00 (T2 - CN)",
    phone: "024 3876 1234",
    amenities: ["Wifi miễn phí", "Phòng chờ máy lạnh", "Cà phê", "Camera an ninh"],
    gallery: [
      IMG("photo-1486006920555-c77dcf18193c"),
      IMG("photo-1632823471565-1ecdf5c6da77"),
      IMG("photo-1492144534655-ae79c964c9d7"),
    ],
    reviews: [
      {
        id: "r1",
        author: "Nguyễn Văn A",
        avatar: IMG("photo-1535713875002-d1d0cf377fde"),
        rating: 5,
        date: "12/09/2026",
        content: "Thay dầu nhanh, nhân viên nhiệt tình. Sẽ quay lại.",
      },
      {
        id: "r2",
        author: "Trần Thị B",
        avatar: IMG("photo-1438761681033-6461ffad8d80"),
        rating: 4,
        date: "05/09/2026",
        content: "Giá hơi cao nhưng chất lượng ổn. Garage sạch sẽ.",
      },
    ],
    serviceMenu: [
      {
        id: "s1",
        name: "Thay dầu động cơ",
        description: "Thay dầu nhớt các loại, bao gồm lọc dầu",
        priceFrom: 350000,
        durationMin: 30,
      },
      {
        id: "s2",
        name: "Bảo dưỡng định kỳ 10.000km",
        description: "Kiểm tra tổng quát, thay dầu, lọc gió, lọc dầu",
        priceFrom: 1200000,
        durationMin: 120,
      },
      {
        id: "s3",
        name: "Vệ sinh kim phun",
        description: "Vệ sinh kim phun, buồng đốt bằng máy chuyên dụng",
        priceFrom: 800000,
        durationMin: 90,
      },
    ],
    availability: {
      "2026-10-03": ["09:00", "10:30", "14:00", "15:30"],
      "2026-10-04": ["08:30", "11:00", "13:30", "16:00"],
      "2026-10-05": ["09:30", "14:30", "17:00"],
    },
  },
  {
    id: "g2",
    slug: "garage-thanh-binh",
    name: "Garage Thanh Bình",
    address: "456 Lê Hồng Phong, Q.10",
    city: "TP.HCM",
    rating: 4.6,
    reviewsCount: 189,
    distanceKm: 3.5,
    priceFrom: 180000,
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    services: ["Sơn xe", "Sửa chữa thân vỏ"],
    openNow: true,
    isFeatured: true,
    description: "Chuyên sơn và phục hồi thân vỏ xe ô tô các dòng.",
    workingHours: "08:00 - 18:00 (T2 - T7)",
    phone: "028 3987 5678",
    amenities: ["Phòng chờ", "Bảo hành 6 tháng"],
    gallery: [IMG("photo-1632823471565-1ecdf5c6da77")],
    reviews: [],
    serviceMenu: [
      {
        id: "s4",
        name: "Sơn xe 1 chi tiết",
        description: "Sơn, đánh bóng 1 chi tiết thân vỏ",
        priceFrom: 2500000,
        durationMin: 240,
      },
    ],
    availability: {
      "2026-10-03": ["08:00", "13:00"],
      "2026-10-04": ["09:00", "14:00"],
    },
  },
  {
    id: "g3",
    slug: "garage-phu-long",
    name: "Garage Phú Long",
    address: "789 Trần Phú, Q. Hải Châu",
    city: "Đà Nẵng",
    rating: 4.9,
    reviewsCount: 312,
    distanceKm: 0.8,
    priceFrom: 250000,
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    services: ["Điện - Điều hòa", "Sửa chữa tổng quát"],
    openNow: false,
    isFeatured: true,
    description: "Garage chuyên về hệ thống điện, điều hòa ô tô.",
    workingHours: "07:30 - 19:30",
    phone: "023 6389 4321",
    amenities: ["Wifi", "Đón tiếng Anh"],
    gallery: [],
    reviews: [],
    serviceMenu: [],
    availability: {},
  },
  {
    id: "g4",
    slug: "garage-an-khang",
    name: "Garage An Khang",
    address: "321 Phan Đăng Lưu, Q. Bình Thạnh",
    city: "TP.HCM",
    rating: 4.7,
    reviewsCount: 156,
    distanceKm: 5.2,
    priceFrom: 200000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    services: ["Bảo dưỡng", "Thay dầu"],
    openNow: true,
    isFeatured: false,
    description: "Garage gia đình phục vụ tận tâm.",
    workingHours: "08:00 - 18:00",
    phone: "028 3540 9876",
    amenities: ["Wifi", "Chỗ đậu xe rộng"],
    gallery: [],
    reviews: [],
    serviceMenu: [],
    availability: {},
  },
];

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "Bảo dưỡng" | "Sửa chữa" | "Sơn & thân vỏ" | "Điện - Điều hòa" | "Lốp & phanh" | "Khác";
  provider: {
    name: string;
    garageId: string;
    city: string;
    address: string;
    rating: number;
    reviewsCount: number;
  };
  durationMin: number;
  priceFrom: number;
  priceTo: number;
  image: string;
  rating: number;
  bookingsCount: number;
  availableSlots: number; // số slot trống trong tuần tới
  warrantyMonths: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  // Lịch trống theo ngày (mock cho booking)
  slotsByDate: Record<string, string[]>; // dateISO -> ['09:00', '10:30', ...]
  // Hạng mục công việc (cho tab "Dịch vụ bao gồm")
  includes: string[];
  // Yêu cầu / lưu ý
  requirements?: string[];
}

export const services: Service[] = [
  {
    id: "sv1",
    slug: "thay-dau-dong-co",
    name: "Thay dầu động cơ",
    description:
      "Thay dầu nhớt chính hãng các loại, kèm lọc dầu. Áp dụng cho xe xăng và diesel, động cơ 1.5L - 3.5L.",
    category: "Bảo dưỡng",
    provider: {
      name: "Garage Minh Anh",
      garageId: "g1",
      city: "Hà Nội",
      address: "123 Nguyễn Văn Cừ, Ngọc Lâm",
      rating: 4.8,
      reviewsCount: 234,
    },
    durationMin: 30,
    priceFrom: 350000,
    priceTo: 800000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    rating: 4.9,
    bookingsCount: 1205,
    availableSlots: 18,
    warrantyMonths: 1,
    isPopular: true,
    isFeatured: true,
    slotsByDate: {
      "2026-10-03": ["09:00", "10:30", "14:00", "15:30"],
      "2026-10-04": ["08:30", "11:00", "13:30", "16:00"],
      "2026-10-05": ["09:30", "14:30", "17:00"],
      "2026-10-06": ["08:00", "10:00", "15:00"],
    },
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
  },
  {
    id: "sv2",
    slug: "bao-duong-10k",
    name: "Bảo dưỡng định kỳ 10.000 km",
    description:
      "Kiểm tra tổng quát 27 hạng mục, thay dầu, lọc dầu, lọc gió, kiểm tra phanh, lốp, ắc quy, đèn chiếu sáng.",
    category: "Bảo dưỡng",
    provider: {
      name: "Garage Minh Anh",
      garageId: "g1",
      city: "Hà Nội",
      address: "123 Nguyễn Văn Cừ, Ngọc Lâm",
      rating: 4.8,
      reviewsCount: 234,
    },
    durationMin: 120,
    priceFrom: 1200000,
    priceTo: 2500000,
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    rating: 4.8,
    bookingsCount: 845,
    availableSlots: 12,
    warrantyMonths: 3,
    isPopular: true,
    isFeatured: true,
    slotsByDate: {
      "2026-10-03": ["08:00", "13:00"],
      "2026-10-04": ["09:00", "14:00"],
      "2026-10-05": ["08:30", "15:00"],
    },
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
  },
  {
    id: "sv3",
    slug: "son-xe-1-chi-tiet",
    name: "Sơn xe 1 chi tiết (cánh cửa, nắp capo...)",
    description:
      "Sơn, đánh bóng 1 chi tiết thân vỏ bằng sơn chính hãng, phòng sơn kín đảm bảo chất lượng.",
    category: "Sơn & thân vỏ",
    provider: {
      name: "Garage Thanh Bình",
      garageId: "g2",
      city: "TP.HCM",
      address: "456 Lê Hồng Phong, Q.10",
      rating: 4.6,
      reviewsCount: 189,
    },
    durationMin: 240,
    priceFrom: 2500000,
    priceTo: 4500000,
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    rating: 4.7,
    bookingsCount: 312,
    availableSlots: 6,
    warrantyMonths: 12,
    isFeatured: true,
    slotsByDate: {
      "2026-10-04": ["08:00", "13:00"],
      "2026-10-05": ["09:00", "14:00"],
      "2026-10-06": ["08:30", "13:30"],
    },
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
  },
  {
    id: "sv4",
    slug: "ve-sinh-kim-phun",
    name: "Vệ sinh kim phun, buồng đốt",
    description:
      "Vệ sinh kim phun bằng máy siêu âm chuyên dụng, làm sạch muội than buồng đốt, giúp xe vận hành mượt mà.",
    category: "Bảo dưỡng",
    provider: {
      name: "Garage Minh Anh",
      garageId: "g1",
      city: "Hà Nội",
      address: "123 Nguyễn Văn Cừ, Ngọc Lâm",
      rating: 4.8,
      reviewsCount: 234,
    },
    durationMin: 90,
    priceFrom: 800000,
    priceTo: 1500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    rating: 4.6,
    bookingsCount: 198,
    availableSlots: 9,
    warrantyMonths: 2,
    slotsByDate: {
      "2026-10-03": ["10:00", "14:00"],
      "2026-10-04": ["09:30", "15:30"],
    },
    includes: [
      "Vệ sinh kim phun bằng máy siêu âm chuyên dụng",
      "Làm sạch muội than buồng đốt",
      "Kiểm tra và reset hệ thống",
      "Chạy thử, đánh giá hiệu quả",
    ],
  },
  {
    id: "sv5",
    slug: "thay-ma-phanh",
    name: "Thay má phanh trước/sau",
    description:
      "Thay má phanh chính hãng, kiểm tra đĩa phanh, xảy dầu phanh. Áp dụng cho các dòng xe phổ thông.",
    category: "Lốp & phanh",
    provider: {
      name: "Garage An Khang",
      garageId: "g4",
      city: "TP.HCM",
      address: "321 Phan Đăng Lưu, Bình Thạnh",
      rating: 4.7,
      reviewsCount: 156,
    },
    durationMin: 60,
    priceFrom: 1500000,
    priceTo: 3500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    rating: 4.7,
    bookingsCount: 276,
    availableSlots: 14,
    warrantyMonths: 6,
    isPopular: true,
    slotsByDate: {
      "2026-10-03": ["08:30", "11:00", "15:00"],
      "2026-10-04": ["09:00", "13:30"],
      "2026-10-05": ["10:00", "14:00", "16:00"],
    },
    includes: [
      "Thay má phanh chính hãng (trước hoặc sau)",
      "Kiểm tra đĩa phanh, cảnh báo mòn",
      "Xảy dầu phanh cũ, thay dầu phanh mới",
      "Chạy thử, kiểm tra lực phanh",
    ],
  },
  {
    id: "sv6",
    slug: "nap-may-dieu-hoa",
    name: "Nạp gas điều hòa + vệ sinh",
    description:
      "Nạp gas R134a/R1234yf, vệ sinh dàn lạnh, lọc gió điều hòa, kiểm tra áp suất gas. Phù hợp mọi dòng xe.",
    category: "Điện - Điều hòa",
    provider: {
      name: "Garage Phú Long",
      garageId: "g3",
      city: "Đà Nẵng",
      address: "789 Trần Phú, Hải Châu",
      rating: 4.9,
      reviewsCount: 312,
    },
    durationMin: 45,
    priceFrom: 400000,
    priceTo: 800000,
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    rating: 4.8,
    bookingsCount: 423,
    availableSlots: 22,
    warrantyMonths: 3,
    isPopular: true,
    slotsByDate: {
      "2026-10-03": ["08:00", "10:00", "13:00", "15:00", "17:00"],
      "2026-10-04": ["08:30", "11:00", "14:00", "16:00"],
      "2026-10-05": ["09:00", "13:30", "15:30"],
    },
    includes: [
      "Nạp gas R134a hoặc R1234yf theo xe",
      "Vệ sinh dàn lạnh, lọc gió điều hòa",
      "Kiểm tra áp suất gas, rò rỉ",
      "Vệ sinh quạt gió nếu cần",
    ],
  },
  {
    id: "sv7",
    slug: "thay-ac-quy",
    name: "Thay ắc quy ô tô",
    description:
      "Thay ắc quy chính hãng GS, Đồng Nai, Varta. Kiểm tra hệ thống sạc, cài đặt lại các thiết bị điện tử.",
    category: "Điện - Điều hòa",
    provider: {
      name: "Garage Phú Long",
      garageId: "g3",
      city: "Đà Nẵng",
      address: "789 Trần Phú, Hải Châu",
      rating: 4.9,
      reviewsCount: 312,
    },
    durationMin: 20,
    priceFrom: 1200000,
    priceTo: 3500000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    rating: 4.7,
    bookingsCount: 198,
    availableSlots: 30,
    warrantyMonths: 18,
    slotsByDate: {
      "2026-10-03": ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"],
      "2026-10-04": ["08:00", "09:30", "11:00", "13:30", "15:00", "16:30"],
    },
    includes: [
      "Ắc quy chính hãng theo dung lượng yêu cầu",
      "Lắp đặt, kiểm tra hệ thống sạc",
      "Cài đặt lại các thiết bị điện tử (radio, đồng hồ...)",
      "Bảo hành 18 tháng theo nhà sản xuất",
    ],
  },
  {
    id: "sv8",
    slug: "thay-lop-o-to",
    name: "Thay lốp ô tô (4 lốp)",
    description:
      "Cung cấp các thương hiệu Michelin, Bridgestone, Continental, Kumho. Cân chỉnh độ chụm sau khi thay.",
    category: "Lốp & phanh",
    provider: {
      name: "Garage An Khang",
      garageId: "g4",
      city: "TP.HCM",
      address: "321 Phan Đăng Lưu, Bình Thạnh",
      rating: 4.7,
      reviewsCount: 156,
    },
    durationMin: 90,
    priceFrom: 4000000,
    priceTo: 12000000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    rating: 4.6,
    bookingsCount: 145,
    availableSlots: 8,
    warrantyMonths: 6,
    slotsByDate: {
      "2026-10-04": ["08:00", "13:00"],
      "2026-10-05": ["09:00", "14:00"],
    },
    includes: [
      "4 lốp chính hãng theo kích thước xe",
      "Tháo lắp, cân chỉnh độ chụm",
      "Cân bằng lốp, kiểm tra áp suất",
      "Bảo hành theo nhà sản xuất lốp",
    ],
  },
];

export const popularServices = [
  { id: "p1", name: "Thay dầu", icon: "🛢️" },
  { id: "p2", name: "Bảo dưỡng định kỳ", icon: "🔧" },
  { id: "p3", name: "Sửa phanh", icon: "🛑" },
  { id: "p4", name: "Sơn xe", icon: "🎨" },
  { id: "p5", name: "Vệ sinh xe", icon: "✨" },
  { id: "p6", name: "Điều hòa", icon: "❄️" },
  { id: "p7", name: "Lốp xe", icon: "🛞" },
  { id: "p8", name: "Ắc quy", icon: "🔋" },
];

// =========================
// CAR LISTINGS (mock — dùng cho Commerce Service ở production)
// =========================
export interface Car {
  id: string;
  slug: string;
  title: string; // VD: "Toyota Vios 1.5G 2023"
  brand: string; // Toyota, Honda, Mazda, Hyundai, Kia, VinFast, BMW, Mercedes
  model: string; // Vios, City, CX-5, Accent, Morning, Fadil, 320i, C200
  year: number;
  bodyType: "Sedan" | "SUV" | "Hatchback" | "MPV" | "Bán tải" | "Coupe";
  fuelType: "Xăng" | "Diesel" | "Hybrid" | "Điện";
  transmission: "Số sàn" | "Số tự động" | "CVT";
  odoKm: number;
  priceVND: number;
  city: string;
  seller: { name: string; type: "Cá nhân" | "Salon" };
  image: string;
  gallery: string[];
  description: string;
  features: string[]; // option nổi bật
  isFeatured?: boolean;
  isNew?: boolean;
  rating: number;
  reviewsCount: number;
}

export const cars: Car[] = [
  {
    id: "c1",
    slug: "toyota-vios-1-5g-2023",
    title: "Toyota Vios 1.5G 2023",
    brand: "Toyota",
    model: "Vios",
    year: 2023,
    bodyType: "Sedan",
    fuelType: "Xăng",
    transmission: "CVT",
    odoKm: 18500,
    priceVND: 489000000,
    city: "TP.HCM",
    seller: { name: "Salon Auto Hùng Phát", type: "Salon" },
    image: IMG("photo-1494976388531-d1058494cdd8"),
    gallery: [
      IMG("photo-1494976388531-d1058494cdd8"),
      IMG("photo-1503376780353-7e6692767b70"),
    ],
    description:
      "Vios 1.5G 2023 mới 95%, lốp còn dày, nội thất nguyên bản, bảo dưỡng định kỳ đầy đủ tại hãng.",
    features: ["Camera lùi", "Cảm biến áp suất lốp", "Màn hình 7 inch", "Apple CarPlay"],
    isFeatured: true,
    isNew: true,
    rating: 4.7,
    reviewsCount: 23,
  },
  {
    id: "c2",
    slug: "honda-city-rs-2022",
    title: "Honda City RS 2022",
    brand: "Honda",
    model: "City",
    year: 2022,
    bodyType: "Sedan",
    fuelType: "Xăng",
    transmission: "CVT",
    odoKm: 32000,
    priceVND: 519000000,
    city: "Hà Nội",
    seller: { name: "Nguyễn Văn A", type: "Cá nhân" },
    image: IMG("photo-1606664515524-ed2f786a0bd6"),
    gallery: [IMG("photo-1606664515524-ed2f786a0bd6")],
    description:
      "Honda City RS bản thể thao, đã thay dầu định kỳ, còn bảo hành chính hãng 1 năm.",
    features: ["Honda Sensing", "Cruise Control thích ứng", "Đèn LED", "Mâm 16 inch"],
    isFeatured: true,
    rating: 4.6,
    reviewsCount: 18,
  },
  {
    id: "c3",
    slug: "mazda-cx-5-2022",
    title: "Mazda CX-5 2.0 Premium 2022",
    brand: "Mazda",
    model: "CX-5",
    year: 2022,
    bodyType: "SUV",
    fuelType: "Xăng",
    transmission: "Số tự động",
    odoKm: 45000,
    priceVND: 779000000,
    city: "TP.HCM",
    seller: { name: "Salon Auto Premium", type: "Salon" },
    image: IMG("photo-1519440432185-1e8478d971d4"),
    gallery: [IMG("photo-1519440432185-1e8478d971d4")],
    description:
      "CX-5 Premium đầy đủ option: ghế da, cửa sổ trời, BOSE 10 loa, camera 360.",
    features: ["Ghế da Nappa", "Cửa sổ trời", "BOSE 10 loa", "Camera 360"],
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 41,
  },
  {
    id: "c4",
    slug: "hyundai-accent-1-4at-2023",
    title: "Hyundai Accent 1.4AT 2023",
    brand: "Hyundai",
    model: "Accent",
    year: 2023,
    bodyType: "Sedan",
    fuelType: "Xăng",
    transmission: "Số tự động",
    odoKm: 12000,
    priceVND: 439000000,
    city: "Đà Nẵng",
    seller: { name: "Hyundai Đà Nẵng", type: "Salon" },
    image: IMG("photo-1502877338535-766e1452684a"),
    gallery: [IMG("photo-1502877338535-766e1452684a")],
    description:
      "Accent 2023 bản đặc biệt, mới 99%, đi rất ít, full option chính hãng.",
    features: ["Apple CarPlay/Android Auto", "Cảm biến đỗ xe", "Đèn LED", "Mâm đúc"],
    rating: 4.5,
    reviewsCount: 12,
  },
  {
    id: "c5",
    slug: "vinfast-vf8-plus-2024",
    title: "VinFast VF8 Plus 2024",
    brand: "VinFast",
    model: "VF8",
    year: 2024,
    bodyType: "SUV",
    fuelType: "Điện",
    transmission: "Số tự động",
    odoKm: 8200,
    priceVND: 1099000000,
    city: "Hà Nội",
    seller: { name: "VinFast Trần Duy Hưng", type: "Salon" },
    image: IMG("photo-1593941707882-a5bba14938c7"),
    gallery: [IMG("photo-1593941707882-a5bba14938c7")],
    description:
      "VF8 Plus bản cao cấp, đi 8.200 km, còn bảo hành pin 8 năm từ VinFast.",
    features: ["Pin 87.7 kWh", "Tự lái cấp 2", "Màn hình 15.6 inch", "Sạc nhanh DC"],
    isFeatured: true,
    rating: 4.4,
    reviewsCount: 8,
  },
  {
    id: "c6",
    slug: "kia-morning-2021",
    title: "Kia Morning 1.25 AT 2021",
    brand: "Kia",
    model: "Morning",
    year: 2021,
    bodyType: "Hatchback",
    fuelType: "Xăng",
    transmission: "Số tự động",
    odoKm: 55000,
    priceVND: 299000000,
    city: "TP.HCM",
    seller: { name: "Trần Thị B", type: "Cá nhân" },
    image: IMG("photo-1471444928139-48c5bf5173e"),
    gallery: [IMG("photo-1471444928139-48c5bf5173e")],
    description:
      "Morning 2021 đi gia đình, còn mới, bảo dưỡng định kỳ đầy đủ, phù hợp đi phố.",
    features: ["Màn hình 8 inch", "Apple CarPlay", "Camera lùi"],
    rating: 4.3,
    reviewsCount: 6,
  },
];

// =========================
// PARTS / ACCESSORIES (mock — dùng cho Commerce Service ở production)
// =========================
export interface Part {
  id: string;
  slug: string;
  name: string;
  category:
    | "Lốp xe"
    | "Ắc quy"
    | "Lọc dầu / Lọc gió"
    | "Đèn / Pha"
    | "Nội thất"
    | "Phụ kiện ngoại thất"
    | "Dầu nhớt"
    | "Phanh";
  brand: string;
  priceVND: number;
  originalPriceVND?: number;
  image: string;
  shortDescription: string;
  compatibleCars?: string[];
  stockQty: number;
  rating: number;
  reviewsCount: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
}

export const parts: Part[] = [
  {
    id: "pt1",
    slug: "lop-michelin-primacy-4-205-55r16",
    name: "Lốp Michelin Primacy 4 205/55R16",
    category: "Lốp xe",
    brand: "Michelin",
    priceVND: 2450000,
    originalPriceVND: 2750000,
    image: IMG("photo-1568844293986-8d0400bd4745"),
    shortDescription:
      "Lốp du lịch cao cấp, độ bám đường ướt tốt, tuổi thọ 50.000 km.",
    compatibleCars: ["Toyota Vios", "Honda City", "Mazda 3"],
    stockQty: 84,
    rating: 4.9,
    reviewsCount: 124,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: "pt2",
    slug: "ac-quy-gs-12v-65ah",
    name: "Ắc quy GS 12V 65Ah (MF)",
    category: "Ắc quy",
    brand: "GS",
    priceVND: 1450000,
    image: IMG("photo-1620714223084-8fcacc6dfd75"),
    shortDescription:
      "Ắc quy khô miễn bảo dưỡng, phù hợp sedan/hatchback phổ thông.",
    compatibleCars: ["Toyota Vios", "Honda City", "Hyundai Accent", "Kia Morning"],
    stockQty: 56,
    rating: 4.7,
    reviewsCount: 89,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    id: "pt3",
    slug: "dau-nhot-castrol-magnatec-10w30",
    name: "Dầu nhớt Castrol Magnatec 10W-30 (4L)",
    category: "Dầu nhớt",
    brand: "Castrol",
    priceVND: 520000,
    originalPriceVND: 580000,
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    shortDescription:
      "Dầu bán tổng hợp, bảo vệ động cơ ngay từ lúc khởi động.",
    compatibleCars: ["Toyota Vios", "Honda City", "Mazda 3", "Hyundai Accent"],
    stockQty: 120,
    rating: 4.8,
    reviewsCount: 156,
    isBestSeller: true,
  },
  {
    id: "pt4",
    slug: "bo-loc-dau-mahle-oc195",
    name: "Bộ lọc dầu Mahle OC195 (tương thích Toyota/Honda)",
    category: "Lọc dầu / Lọc gió",
    brand: "Mahle",
    priceVND: 95000,
    image: IMG("photo-1487754180451-c456f719a1fc"),
    shortDescription: "Lọc dầu chính hãng Mahle, chất lượng OE.",
    compatibleCars: ["Toyota", "Honda", "Mazda"],
    stockQty: 240,
    rating: 4.7,
    reviewsCount: 78,
    isFeatured: true,
  },
  {
    id: "pt5",
    slug: "den-led-philips-ultinon-h7",
    name: "Bóng đèn LED Philips Ultinon H7",
    category: "Đèn / Pha",
    brand: "Philips",
    priceVND: 890000,
    originalPriceVND: 1100000,
    image: IMG("photo-1493238792000-8113da705763"),
    shortDescription: "Ánh sáng trắng 6500K, sáng hơn 200% so với halogen thường.",
    stockQty: 65,
    rating: 4.6,
    reviewsCount: 47,
  },
  {
    id: "pt6",
    slug: "tham-san-3d-kia-morning",
    name: "Thảm sàn 3D cao cấp Kia Morning",
    category: "Nội thất",
    brand: "OEM",
    priceVND: 850000,
    image: IMG("photo-1549399542-7e3f8b79c341"),
    shortDescription: "Thảm sàn 3D chống trượt, ôm sàn chuẩn xe, dễ vệ sinh.",
    compatibleCars: ["Kia Morning"],
    stockQty: 38,
    rating: 4.4,
    reviewsCount: 22,
  },
  {
    id: "pt7",
    slug: "camera-hanh-trinh-viofo-a119-v3",
    name: "Camera hành trình Viofo A119 V3",
    category: "Phụ kiện ngoại thất",
    brand: "Viofo",
    priceVND: 2350000,
    image: IMG("photo-1593941707882-a5bba14938c7"),
    shortDescription:
      "Camera hành trình 2K, GPS tích hợp, ghi hình trước sau.",
    stockQty: 28,
    rating: 4.8,
    reviewsCount: 64,
    isFeatured: true,
  },
  {
    id: "pt8",
    slug: "bo-ma-phanh-brembo-truoc",
    name: "Bộ má phanh Brembo trước (Ceramic)",
    category: "Phanh",
    brand: "Brembo",
    priceVND: 2890000,
    originalPriceVND: 3200000,
    image: IMG("photo-1486006920555-c77dcf18193c"),
    shortDescription:
      "Má phanh Brembo ceramic, phanh nhạy, bền, không bám bụi.",
    stockQty: 32,
    rating: 4.9,
    reviewsCount: 91,
    isFeatured: true,
    isBestSeller: true,
  },
];

export const articles: Article[] = [
  {
    id: "a1",
    slug: "cach-chon-dau-nhot",
    title: "Cách chọn dầu nhớt phù hợp cho xe ô tô của bạn",
    excerpt:
      "Hướng dẫn chi tiết giúp bạn chọn loại dầu nhớt phù hợp với dòng xe, điều kiện vận hành và khí hậu tại Việt Nam.",
    image: IMG("photo-1487754180451-c456f719a1fc"),
    category: "Bảo dưỡng",
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: IMG("photo-1535713875002-d1d0cf377fde"),
      role: "Kỹ thuật viên trưởng — Garage Minh Anh",
    },
    publishedAt: "01/10/2026",
    readMinutes: 5,
    isFeatured: true,
    tags: ["dầu nhớt", "bảo dưỡng", "động cơ"],
    sections: [
      {
        type: "paragraph",
        text: "Dầu nhớt là \"máu\" của động cơ — bôi trơn, làm mát, làm sạch và bảo vệ các chi tiết kim loại khỏi mài mòn. Chọn sai loại dầu có thể khiến động cơ kêu to, tốn nhiên liệu, hoặc hỏng nặng sau vài nghìn km.",
      },
      {
        type: "heading",
        level: 2,
        text: "1. Hiểu các thông số trên chai dầu",
        id: "thong-so",
      },
      {
        type: "paragraph",
        text: "Mỗi chai dầu đều có dãy thông số theo chuẩn SAE (ví dụ 5W-30, 10W-40). Đây là độ nhớt — khả năng chảy của dầu ở nhiệt độ khác nhau.",
      },
      {
        type: "list",
        items: [
          "W (Winter): độ nhớt khi lạnh — số càng nhỏ, dầu chảy càng dễ khi khởi động.",
          "Số sau W: độ nhớt khi nóng (100°C) — số càng lớn, dầu càng đặc ở nhiệt độ cao.",
          "VD: 5W-30 — chảy dễ khi lạnh, độ đặc vừa khi nóng.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "Mẹo nhanh",
        text: "Tại Việt Nam (khí hậu nóng ẩm), đa số xe phổ thông dùng 5W-30 hoặc 10W-30 là phù hợp.",
      },
      {
        type: "heading",
        level: 2,
        text: "2. Chọn theo khuyến cáo của nhà sản xuất xe",
        id: "khuyen-cao",
      },
      {
        type: "paragraph",
        text: "Luôn ưu tiên thông số dầu ghi trong sách hướng dẫn sử dụng xe (Owner Manual). Ví dụ: Toyota Vios 2023 yêu cầu 0W-20 hoặc 5W-30 theo tiêu chuẩn API SP.",
      },
      {
        type: "quote",
        text: "Dùng dầu đặc hơn khuyến cáo sẽ không bảo vệ động cơ tốt hơn — ngược lại còn gây tốn nhiên liệu và mài mòn nhanh hơn.",
      },
      {
        type: "heading",
        level: 2,
        text: "3. Loại dầu: bán tổng hợp, tổng hợp hay khoáng?",
        id: "loai-dau",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Dầu khoáng (Mineral): rẻ nhất, phù hợp xe cũ, thay dầu mỗi 3.000–5.000 km.",
          "Dầu bán tổng hợp (Semi-synthetic): phổ thông nhất, thay mỗi 5.000–7.000 km.",
          "Dầu tổng hợp (Full synthetic): đắt nhất, thay mỗi 10.000–15.000 km, bảo vệ tốt nhất.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "4. Khi nào cần thay dầu?",
        id: "khi-nao-thay",
      },
      {
        type: "paragraph",
        text: "Quy tắc phổ biến: mỗi 5.000 km HOẶC 6 tháng (tuỳ điều kiện nào đến trước). Nếu xe chạy trong thành phố nhiều, kẹt xe thường xuyên, nên rút ngắn còn 3.000–4.000 km.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Lưu ý",
        text: "Không nên trộn lẫn 2 loại dầu khác thông số. Nếu buộc phải châm thêm, hãy chọn cùng thương hiệu + cùng thông số SAE.",
      },
    ],
  },
  {
    id: "a2",
    slug: "bao-lau-bao-duong",
    title: "Bao lâu nên bảo dưỡng định kỳ một lần?",
    excerpt:
      "Tần suất bảo dưỡng định kỳ theo khuyến cáo của nhà sản xuất — và 4 dấu hiệu xe cần đưa đi kiểm tra ngay.",
    image: IMG("photo-1492144534655-ae79c964c9d"),
    category: "Kiến thức",
    author: {
      name: "Trần Quốc Đạt",
      avatar: IMG("photo-1438761681033-6461ffad8d80"),
      role: "Chuyên gia tư vấn — AutoCare",
    },
    publishedAt: "28/09/2026",
    readMinutes: 4,
    isFeatured: true,
    tags: ["bảo dưỡng", "định kỳ", "ô tô"],
    sections: [
      {
        type: "paragraph",
        text: "Bảo dưỡng định kỳ giúp xe vận hành ổn định, tiết kiệm nhiên liệu và kéo dài tuổi thọ động cơ. Tuy nhiên, nhiều chủ xe vẫn bỏ qua vì nghĩ \"xe còn chạy tốt\".",
      },
      {
        type: "heading",
        level: 2,
        text: "Các mốc bảo dưỡng phổ biến",
        id: "cac-moc",
      },
      {
        type: "list",
        items: [
          "5.000 km: thay dầu + lọc dầu.",
          "10.000 km: thay dầu + lọc dầu + lọc gió động cơ.",
          "20.000 km: thay dầu + kiểm tra phanh + lọc gió điều hòa.",
          "40.000 km: thay dầu + bảo dưỡng hệ thống phanh + dầu phanh.",
          "80.000 km: thay dầu + kiểm tra hệ thống treo, truyền động.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "4 dấu hiệu cần đưa xe đi kiểm tra ngay",
        id: "dau-hieu",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Đèn báo động cơ sáng (Check Engine).",
          "Tiếng kêu lạ từ động cơ, phanh, hoặc hệ thống treo.",
          "Xe hao xăng hơn bình thường >10%.",
          "Rung giật khi chạy ở tốc độ cao hoặc khi phanh.",
        ],
      },
      {
        type: "callout",
        tone: "success",
        title: "Tiết kiệm chi phí lâu dài",
        text: "Một lần bảo dưỡng 1,2 triệu mỗi 10.000 km rẻ hơn rất nhiều so với thay động cơ 80-150 triệu khi hỏng nặng.",
      },
    ],
  },
  {
    id: "a3",
    slug: "dau-hieu-can-thay-phanh",
    title: "5 dấu hiệu cảnh báo cần thay má phanh",
    excerpt:
      "Đừng bỏ qua những dấu hiệu này — phanh hỏng có thể gây nguy hiểm nghiêm trọng cho bạn và người xung quanh.",
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    category: "An toàn",
    author: {
      name: "Lê Hoàng Phúc",
      avatar: IMG("photo-1535713875002-d1d0cf377fde"),
      role: "Thợ sửa chữa cao cấp — Garage Phú Long",
    },
    publishedAt: "25/09/2026",
    readMinutes: 6,
    isFeatured: true,
    tags: ["phanh", "an toàn", "má phanh"],
    sections: [
      {
        type: "paragraph",
        text: "Má phanh là bộ phận chịu mài mòn nhiều nhất — chúng \"hy sinh\" để bảo vệ đĩa phanh và an toàn cho bạn. Vì vậy, cần kiểm tra định kỳ và thay thế khi đến giới hạn.",
      },
      {
        type: "heading",
        level: 2,
        text: "1. Tiếng rít khi phanh",
        id: "tieng-rit",
      },
      {
        type: "paragraph",
        text: "Hầu hết má phanh có \"còi cảnh báo\" — miếng kim loại nhỏ cọ vào đĩa khi má mòn tới giới hạn. Khi nghe tiếng rít chói tai, bạn nên đặt lịch thay phanh trong vòng 1-2 tuần.",
      },
      {
        type: "heading",
        level: 2,
        text: "2. Phanh \"đá\" hoặc rung tay lái",
        id: "phanh-da",
      },
      {
        type: "paragraph",
        text: "Nếu vô-lang rung khi phanh, có thể đĩa phanh đã bị mòn không đều, cong vênh do nhiệt. Cần kiểm tra đĩa phanh và thay nếu vượt quá dung sai.",
      },
      {
        type: "heading",
        level: 2,
        text: "3. Phải đạp sâu hơn bình thường",
        id: "dap-sau",
      },
      {
        type: "paragraph",
        text: "Phanh \"mềm\" hoặc phải đạp gần sàn xe là dấu hiệu dầu phanh bị rò rỉ, hoặc má phanh đã mòn gần hết.",
      },
      {
        type: "heading",
        level: 2,
        text: "4. Xe bị kéo sang một bên khi phanh",
        id: "keo-lech",
      },
      {
        type: "paragraph",
        text: "Đây là dấu hiệu nguy hiểm — xy-lanh phanh hoặc má phanh bên đó đang bị kẹt. Cần đưa xe đi kiểm tra ngay lập tức.",
      },
      {
        type: "heading",
        level: 2,
        text: "5. Đèn báo phanh sáng trên bảng đồng hồ",
        id: "den-bao",
      },
      {
        type: "paragraph",
        text: "Nhiều xe hiện đại có cảm biến độ dày má phanh — khi đèn báo sáng, nghĩa là đã đến lúc thay.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Khoảng cách thay má phanh",
        text: "Trung bình mỗi 30.000-70.000 km tuỳ loại xe và điều kiện vận hành. Nếu chạy trong thành phố nhiều, nên kiểm tra mỗi 10.000 km.",
      },
    ],
  },
  {
    id: "a4",
    slug: "kinh-nghiem-mua-xe-cu",
    title: "Kinh nghiệm mua xe cũ: 7 điều cần kiểm tra trước khi xuống tiền",
    excerpt:
      "Mua xe cũ tiềm ẩn nhiều rủi ro nếu không kiểm tra kỹ. Đây là checklist từ chuyên gia để bạn tránh \"hố\".",
    image: IMG("photo-1494976388531-d1058494cdd8"),
    category: "Mua bán xe",
    author: {
      name: "Phạm Văn Sỹ",
      avatar: IMG("photo-1500648767791-00dcc994a43e"),
      role: "Chuyên gia thẩm định xe — AutoCare Pro",
    },
    publishedAt: "20/09/2026",
    readMinutes: 8,
    tags: ["xe cũ", "mua bán", "checklist"],
    sections: [
      {
        type: "paragraph",
        text: "Mua xe cũ giúp tiết kiệm chi phí, nhưng cũng tiềm ẩn rủi ro nếu không kiểm tra kỹ. Dưới đây là 7 điều bạn cần kiểm tra trước khi quyết định mua.",
      },
      {
        type: "heading",
        level: 2,
        text: "1. Kiểm tra giấy tờ xe",
        id: "giay-to",
      },
      {
        type: "list",
        items: [
          "Đăng ký xe (cavet) chính chủ.",
          "Sổ bảo hành + sổ bảo dưỡng (nếu có).",
          "Đối chiếu số khung, số máy trên xe với giấy tờ.",
          "Kiểm tra xe có bị thế chấp ngân hàng không (tra cứu trên Cục Đăng kiểm).",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "2. Kiểm tra thân vỏ",
        id: "than-vo",
      },
      {
        type: "paragraph",
        text: "Đứng cách xe 3-5m, quan sát dưới ánh sáng tự nhiên. Nếu thấy khoảng cách giữa các khe cửa, nắp capo không đều → xe có thể đã sơn lại do tai nạn.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Mẹo",
        text: "Dùng nam châm nhỏ để kiểm tra các vị trí sơn lại — nếu nam châm không hút, có thể đã bả sơn.",
      },
      {
        type: "heading",
        level: 2,
        text: "3. Kiểm tra động cơ",
        id: "dong-co",
      },
      {
        type: "list",
        items: [
          "Khởi động nguội — động cơ phải nổ trong vòng 2-3 giây.",
          "Quan sát khói xả: trắng (nước), đen (xăng), xanh (dầu cháy) đều là dấu hiệu xấu.",
          "Nghe tiếng kêu lạ từ động cơ.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "4. Chạy thử trên 30km",
        id: "chay-thu",
      },
      {
        type: "paragraph",
        text: "Chạy thử đủ các điều kiện: đường nhựa, đường xấu, leo dốc, phanh gấp. Lưu ý cảm giác vô-lang, hộp số, hệ thống treo.",
      },
      {
        type: "heading",
        level: 2,
        text: "5. Kiểm tra hệ thống điện",
        id: "dien",
      },
      {
        type: "list",
        items: [
          "Bật hết các thiết bị: đèn, còi, điều hòa, camera, màn hình.",
          "Kiểm tra ắc quy: nếu yếu, đề nghị giảm giá hoặc thay mới.",
          "Kiểm tra cổng OBD bằng máy chuyên dụng (nếu có).",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "6. Lịch sử tai nạn / thuỷ kích",
        id: "tai-nan",
      },
      {
        type: "paragraph",
        text: "Tra cứu trên các trang như AutoCheck.vn hoặc đăng kiểm để biết xe có từng tai nạn, ngập nước hay không.",
      },
      {
        type: "heading",
        level: 2,
        text: "7. Đàm phán giá và công chứng",
        id: "dam-phan",
      },
      {
        type: "paragraph",
        text: "Sau khi kiểm tra, bạn đã có cơ sở để đàm phán. Lưu ý: giao dịch phải công chứng sang tên tại phòng công chứng — tuyệt đối không đặt cọc trước khi công chứng.",
      },
      {
        type: "callout",
        tone: "warning",
        title: "Cảnh báo",
        text: "Không mua xe nếu chủ xe từ chối cho kiểm tra, chạy thử, hoặc không xuất trình đủ giấy tờ.",
      },
    ],
  },
  {
    id: "a5",
    slug: "loi-thuong-gap-mua-he",
    title: "7 lỗi thường gặp trên xe ô tô vào mùa hè",
    excerpt:
      "Nắng nóng khiến nhiều bộ phận trên xe chịu áp lực lớn. Đây là các lỗi phổ biến và cách phòng tránh.",
    image: IMG("photo-1493238792000-8113da705763"),
    category: "Bảo dưỡng",
    author: {
      name: "Nguyễn Minh Tuấn",
      avatar: IMG("photo-1535713875002-d1d0cf377fde"),
      role: "Kỹ thuật viên trưởng — Garage Minh Anh",
    },
    publishedAt: "15/09/2026",
    readMinutes: 5,
    tags: ["mùa hè", "bảo dưỡng", "nắng nóng"],
    sections: [
      {
        type: "paragraph",
        text: "Mùa hè với nhiệt độ 35-40°C là thử thách lớn cho xe ô tô. Dưới đây là 7 lỗi thường gặp và cách phòng tránh.",
      },
      {
        type: "heading",
        level: 2,
        text: "1. Nổ lốp do áp suất tăng",
        id: "no-lop",
      },
      {
        type: "paragraph",
        text: "Áp suất lốp tăng 0.2 bar mỗi khi nhiệt độ môi trường tăng 10°C. Lốp quá căng dễ nổ khi chạy tốc độ cao.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Mẹo",
        text: "Kiểm tra áp suất lốp vào sáng sớm (khi lốp còn nguội) theo khuyến cáo của nhà sản xuất — thường 2.2-2.5 bar cho xe phổ thông.",
      },
      {
        type: "heading",
        level: 2,
        text: "2. Điều hòa không mát",
        id: "dieu-hoa",
      },
      {
        type: "paragraph",
        text: "Nguyên nhân phổ biến: thiếu gas, lọc gió bẩn, quạt gió yếu. Nên vệ sinh + nạp gas điều hòa mỗi 1-2 năm.",
      },
      {
        type: "heading",
        level: 2,
        text: "3. Bình ắc quy yếu",
        id: "ac-quy",
      },
      {
        type: "paragraph",
        text: "Nhiệt độ cao đẩy nhanh quá trình bay hơi nước trong ắc quy. Bình ắc quy trên 3 năm tuổi nên thay mới.",
      },
      {
        type: "heading",
        level: 2,
        text: "4. Động cơ quá nhiệt",
        id: "qua-nhiet",
      },
      {
        type: "paragraph",
        text: "Két nước bẩn, quạt tản nhiệt yếu, hoặc rò rỉ nước làm mát đều có thể khiến động cơ quá nhiệt. Nếu đồng hồ nhiệt độ vượt 100°C, dừng xe ngay.",
      },
      {
        type: "heading",
        level: 2,
        text: "5. Sơn xe bị phai màu",
        id: "son-phai",
      },
      {
        type: "paragraph",
        text: "Tia UV phá huỷ lớp sơn dần theo thời gian. Nên đỗ xe trong bóng râm hoặc dùng bạt phủ — đánh bóng sơn mỗi 6 tháng.",
      },
    ],
  },
  {
    id: "a6",
    slug: "so-sanh-lop-michelin-bridgestone",
    title: "So sánh lốp Michelin vs Bridgestone: Nên chọn loại nào?",
    excerpt:
      "Hai thương hiệu lốp hàng đầu thế giới — điểm mạnh, điểm yếu và đối tượng phù hợp của từng loại.",
    image: IMG("photo-1568844293986-8d0400bd4745"),
    category: "Kinh nghiệm",
    author: {
      name: "Phạm Văn Sỹ",
      avatar: IMG("photo-1500648767791-00dcc994a43e"),
      role: "Chuyên gia tư vấn phụ tùng",
    },
    publishedAt: "10/09/2026",
    readMinutes: 7,
    tags: ["lốp xe", "Michelin", "Bridgestone"],
    sections: [
      {
        type: "paragraph",
        text: "Michelin và Bridgestone là hai thương hiệu lốp hàng đầu thế giới. Cả hai đều có chất lượng tốt, nhưng có những đặc điểm khác nhau tuỳ điều kiện sử dụng.",
      },
      {
        type: "heading",
        level: 2,
        text: "Michelin — Tập trung độ bền và an toàn",
        id: "michelin",
      },
      {
        type: "list",
        items: [
          "Độ bám đường ướt tốt nhất trong phân khúc.",
          "Tuổi thọ trung bình 50.000-70.000 km.",
          "Tiếng ồn thấp, êm ái.",
          "Giá cao hơn 10-20% so với Bridgestone.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Bridgestone — Cân bằng giữa giá và chất lượng",
        id: "bridgestone",
      },
      {
        type: "list",
        items: [
          "Độ bám khá tốt (không bằng Michelin nhưng trên trung bình).",
          "Tuổi thọ 40.000-60.000 km.",
          "Phù hợp đa dạng điều kiện: phố, cao tốc, đường xấu.",
          "Giá mềm hơn.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Nên chọn loại nào?",
        id: "chon-loai",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Chạy nhiều trong thành phố, đường ướt nhiều → Michelin.",
          "Chạy đa dạng địa hình, muốn tiết kiệm → Bridgestone.",
          "Xe gia đình, ưu tiên êm ái → Michelin.",
          "Xe dịch vụ, chạy nhiều km → Bridgestone.",
        ],
      },
    ],
  },
  {
    id: "a7",
    slug: "tu-van-chon-xe-cho-nu-lai",
    title: "Tư vấn: Chọn xe ô tô nào phù hợp cho nữ lái mới?",
    excerpt:
      "Những dòng xe nhỏ gọn, dễ lái, an toàn và tiết kiệm nhiên liệu — phù hợp cho nữ mới học lái.",
    image: IMG("photo-1471444928139-48c5bf5173e"),
    category: "Mua bán xe",
    author: {
      name: "Trần Quốc Đạt",
      avatar: IMG("photo-1438761681033-6461ffad8d80"),
      role: "Chuyên gia tư vấn — AutoCare",
    },
    publishedAt: "05/09/2026",
    readMinutes: 6,
    tags: ["xe cho nữ", "xe nhỏ", "xe mới"],
    sections: [
      {
        type: "paragraph",
        text: "Nữ mới lái thường ưu tiên xe nhỏ gọn, dễ đỗ, tầm nhìn tốt. Dưới đây là 3 dòng xe phù hợp với tiêu chí đó.",
      },
      {
        type: "heading",
        level: 2,
        text: "Kia Morning — \"Huyền thoại\" xe nhỏ",
        id: "morning",
      },
      {
        type: "list",
        items: [
          "Kích thước nhỏ gọn — dễ len lỏi trong phố.",
          "Chi phí thấp: giá xe mới từ 350 triệu.",
          "Tiết kiệm xăng: ~5L/100km.",
          "Đầy đủ option: cảm biến lùi, camera 360.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Hyundai i10 — Cao hơn, tầm nhìn tốt hơn",
        id: "i10",
      },
      {
        type: "list",
        items: [
          "Khoảng sáng gầm cao — dễ quan sát.",
          "Thiết kế trẻ trung, nhiều màu.",
          "Động cơ 1.2L đủ dùng trong phố.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Honda City — Nếu cần sedan",
        id: "city",
      },
      {
        type: "paragraph",
        text: "City là lựa chọn an toàn với Honda Sensing (phanh tự động, giữ làn) — rất phù hợp cho người mới lái trên cao tốc.",
      },
    ],
  },
  {
    id: "a8",
    slug: "cac-loai-den-led-o-to",
    title: "Các loại đèn LED ô tô phổ biến: Halogen, LED, Xenon, Laser",
    excerpt:
      "So sánh 4 công nghệ đèn pha ô tô — ưu nhược điểm và loại nào phù hợp với bạn.",
    image: IMG("photo-1493238792000-8113da705763"),
    category: "Kiến thức",
    author: {
      name: "Lê Hoàng Phúc",
      avatar: IMG("photo-1535713875002-d1d0cf377fde"),
      role: "Thợ sửa chữa cao cấp — Garage Phú Long",
    },
    publishedAt: "01/09/2026",
    readMinutes: 5,
    tags: ["đèn LED", "pha", "ánh sáng"],
    sections: [
      {
        type: "paragraph",
        text: "Đèn pha là một trong những yếu tố an toàn quan trọng nhất. Hiện nay có 4 công nghệ phổ biến: Halogen, LED, Xenon (HID), và Laser.",
      },
      {
        type: "heading",
        level: 2,
        text: "Halogen — Giá rẻ, dễ thay thế",
        id: "halogen",
      },
      {
        type: "list",
        items: [
          "Giá chỉ từ 100-200k/bóng.",
          "Ánh sáng vàng ấm, độ bám đường tốt.",
          "Tuổi thọ thấp: ~1.000-2.000 giờ.",
          "Tiêu hao nhiều điện năng.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "LED — Sáng, tiết kiệm, bền",
        id: "led",
      },
      {
        type: "list",
        items: [
          "Ánh sáng trắng 5000-6500K — gần giống ánh sáng ban ngày.",
          "Tiết kiệm điện 50-70% so với halogen.",
          "Tuổi thọ 15.000-30.000 giờ.",
          "Giá 800k-3 triệu/cặp.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Xenon (HID) — Ánh sáng cực mạnh",
        id: "xenon",
      },
      {
        type: "paragraph",
        text: "Xenon cho ánh sáng mạnh nhất nhưng cần ballast và thời gian khởi động lâu hơn. Hiện đang dần bị LED thay thế.",
      },
      {
        type: "heading",
        level: 2,
        text: "Laser — Công nghệ cao cấp nhất",
        id: "laser",
      },
      {
        type: "paragraph",
        text: "Laser cho tầm chiếu xa 600m (gấp đôi LED), nhưng giá rất cao và chỉ có trên xe sang như BMW, Audi.",
      },
      {
        type: "callout",
        tone: "success",
        title: "Khuyến nghị",
        text: "Với xe phổ thông tại Việt Nam, LED là lựa chọn tốt nhất — cân bằng giữa giá, hiệu năng và độ bền.",
      },
    ],
  },
];

export const chatSuggestions = [
  "Cách chọn dầu nhớt cho xe máy?",
  "Bao lâu nên bảo dưỡng định kỳ?",
  "Dấu hiệu cần thay má phanh?",
  "Chi phí sơn xe 4 chỗ khoảng bao nhiêu?",
];

// =========================
// USERS / ORDERS / ADDRESSES / VEHICLES
// (dùng cho trang /profile — F11)
// =========================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled";

export interface OrderItem {
  /** id (id) trong parts/orders/services */
  itemId: string;
  kind: "parts" | "services";
  name: string;
  image: string;
  priceVND: number;
  qty: number;
}

export interface Order {
  id: string; // VD: "ORD-2026-001"
  date: string; // ISO date hoặc DD/MM/YYYY
  status: OrderStatus;
  items: OrderItem[];
  totalVND: number;
  shippingVND: number;
  paymentMethod: "COD" | "Thẻ tín dụng" | "Chuyển khoản" | "Ví điện tử";
  address: string;
  trackingNote?: string;
}

export interface Address {
  id: string;
  label: string; // VD: "Nhà riêng", "Công ty"
  recipient: string;
  phone: string;
  fullAddress: string;
  isDefault?: boolean;
}

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
  orders: Order[];
  addresses: Address[];
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
    orders: [
      {
        id: "ORD-2026-018",
        date: "02/10/2026",
        status: "shipping",
        paymentMethod: "COD",
        totalVND: 2_890_000,
        shippingVND: 30_000,
        address: "123 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
        trackingNote: "Đang giao — dự kiến 03/10",
        items: [
          {
            itemId: "pt8",
            kind: "parts",
            name: "Bộ má phanh Brembo trước (Ceramic)",
            image: IMG("photo-1486006920555-c77dcf18193c"),
            priceVND: 2_890_000,
            qty: 1,
          },
        ],
      },
      {
        id: "ORD-2026-015",
        date: "25/09/2026",
        status: "completed",
        paymentMethod: "Thẻ tín dụng",
        totalVND: 4_400_000,
        shippingVND: 0,
        address: "123 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
        trackingNote: "Đã giao thành công",
        items: [
          {
            itemId: "pt1",
            kind: "parts",
            name: "Lốp Michelin Primacy 4 205/55R16",
            image: IMG("photo-1568844293986-8d0400bd4745"),
            priceVND: 2_450_000,
            qty: 1,
          },
          {
            itemId: "pt3",
            kind: "parts",
            name: "Dầu nhớt Castrol Magnatec 10W-30 (4L)",
            image: IMG("photo-1632823471565-1ecdf5c6da77"),
            priceVND: 520_000,
            qty: 2,
          },
        ],
      },
      {
        id: "ORD-2026-012",
        date: "10/09/2026",
        status: "completed",
        paymentMethod: "Ví điện tử",
        totalVND: 1_450_000,
        shippingVND: 30_000,
        address: "123 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
        items: [
          {
            itemId: "pt2",
            kind: "parts",
            name: "Ắc quy GS 12V 65Ah (MF)",
            image: IMG("photo-1620714223084-8fcacc6dfd75"),
            priceVND: 1_450_000,
            qty: 1,
          },
        ],
      },
      {
        id: "ORD-2026-009",
        date: "20/08/2026",
        status: "completed",
        paymentMethod: "COD",
        totalVND: 350_000,
        shippingVND: 0,
        address: "123 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
        items: [
          {
            itemId: "pt4",
            kind: "parts",
            name: "Bộ lọc dầu Mahle OC195 (tương thích Toyota/Honda)",
            image: IMG("photo-1487754180451-c456f719a1fc"),
            priceVND: 95_000,
            qty: 3,
          },
        ],
      },
    ],
    addresses: [
      {
        id: "a1",
        label: "Nhà riêng",
        recipient: "Nguyễn Văn A",
        phone: "0901 234 567",
        fullAddress:
          "123 Nguyễn Văn Cừ, P. Ngọc Lâm, Q. Long Biên, Hà Nội",
        isDefault: true,
      },
      {
        id: "a2",
        label: "Công ty",
        recipient: "Nguyễn Văn A",
        phone: "0901 234 567",
        fullAddress:
          "Tầng 8, Tòa nhà Viettel, 285 Cách Mạng Tháng 8, P. Bùi Hồng Phúc, Q. Hai Bà Trưng, Hà Nội",
      },
    ],
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