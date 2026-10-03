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
  category: string;
  publishedAt: string;
  readMinutes: number;
}

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

export const articles: Article[] = [
  {
    id: "a1",
    slug: "cach-chon-dau-nhot",
    title: "Cách chọn dầu nhớt phù hợp cho xe ô tô của bạn",
    excerpt: "Hướng dẫn chi tiết giúp bạn chọn loại dầu nhớt phù hợp...",
    image: IMG("photo-1487754180451-c456f719a1fc"),
    category: "Bảo dưỡng",
    publishedAt: "01/10/2026",
    readMinutes: 5,
  },
  {
    id: "a2",
    slug: "bao-lau-bao-duong",
    title: "Bao lâu nên bảo dưỡng định kỳ một lần?",
    excerpt: "Tần suất bảo dưỡng định kỳ theo khuyến cáo của nhà sản xuất...",
    image: IMG("photo-1492144534655-ae79c964c9d7"),
    category: "Kiến thức",
    publishedAt: "28/09/2026",
    readMinutes: 4,
  },
  {
    id: "a3",
    slug: "dau-hieu-can-thay-phanh",
    title: "5 dấu hiệu cảnh báo cần thay má phanh",
    excerpt: "Đừng bỏ qua những dấu hiệu này để đảm bảo an toàn...",
    image: IMG("photo-1632823471565-1ecdf5c6da77"),
    category: "An toàn",
    publishedAt: "25/09/2026",
    readMinutes: 6,
  },
];

export const chatSuggestions = [
  "Cách chọn dầu nhớt cho xe máy?",
  "Bao lâu nên bảo dưỡng định kỳ?",
  "Dấu hiệu cần thay má phanh?",
  "Chi phí sơn xe 4 chỗ khoảng bao nhiêu?",
];