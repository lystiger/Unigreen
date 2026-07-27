import type { Locale } from "./catalogue";

export const LOCALES: readonly Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tags for `lang` and `hreflang`; `Locale` is the URL segment. */
export const HTML_LANG: Record<Locale, string> = { vi: "vi-VN", en: "en" };

/**
 * Rewrite the leading locale segment of a pathname, keeping the rest of the
 * route intact so the language switch stays on the page the reader is on.
 * A path with no recognised locale prefix is prefixed with the target one.
 */
export function swapLocaleInPath(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (first !== undefined && isLocale(first)) {
    return `/${[target, ...rest].join("/")}`;
  }

  return `/${[target, ...segments].join("/")}`;
}

export interface Dictionary {
  readonly nav: {
    readonly products: string;
    readonly oem: string;
    readonly capability: string;
    readonly contact: string;
    readonly inquiry: string;
    readonly openMenu: string;
    readonly closeMenu: string;
    readonly switchLocale: string;
    readonly callUs: string;
    readonly skipToContent: string;
    readonly home: string;
  };
  readonly notFound: {
    readonly title: string;
    readonly body: string;
    readonly cta: string;
  };
  readonly hero: {
    readonly eyebrow: string;
    readonly headline: string;
    readonly headlineAccent: string;
    readonly lead: string;
    readonly primaryCta: string;
    readonly secondaryCta: string;
    readonly packAlt: string;
  };
  readonly specStrip: {
    readonly basisWeight: string;
    readonly plies: string;
    readonly rollLength: string;
    readonly moq: string;
    readonly standard: string;
    readonly label: string;
  };
  readonly products: {
    readonly eyebrow: string;
    readonly title: string;
    readonly viewAll: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly emptyCta: string;
    readonly moq: string;
    readonly cartons: string;
    readonly coreless: string;
    readonly oemBadge: string;
    readonly imagePending: string;
    readonly lines: Record<string, string>;
  };
  readonly oem: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly steps: readonly { readonly title: string; readonly body: string }[];
    readonly cta: string;
  };
  readonly capability: {
    readonly eyebrow: string;
    readonly title: string;
    readonly lead: string;
    readonly certifications: readonly {
      readonly code: string;
      readonly label: string;
    }[];
  };
  readonly inquiry: {
    readonly title: string;
    readonly body: string;
    readonly cta: string;
    readonly orCall: string;
  };
  readonly footer: {
    readonly company: string;
    readonly address: string;
    readonly hotline: string;
    readonly web: string;
    readonly rights: string;
  };
}

const vi: Dictionary = {
  nav: {
    products: "Sản phẩm",
    oem: "Gia công OEM",
    capability: "Năng lực",
    contact: "Liên hệ",
    inquiry: "Yêu cầu báo giá",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    switchLocale: "Chuyển sang tiếng Anh",
    callUs: "Gọi hotline",
    skipToContent: "Bỏ qua, đến nội dung chính",
    home: "Trang chủ",
  },
  notFound: {
    title: "Không tìm thấy trang",
    body: "Đường dẫn không tồn tại hoặc đã được thay đổi.",
    cta: "Về trang chủ",
  },
  hero: {
    eyebrow: "Nhà máy giấy tissue · Hưng Yên",
    headline: "Giấy vệ sinh cuộn lớn,",
    headlineAccent: "không lõi.",
    lead: "Bột giấy nguyên sinh nhập khẩu, công nghệ Nhật Bản, sản xuất theo TCCS 620:2020. Nhận gia công nhãn riêng từ 400 thùng.",
    primaryCta: "Yêu cầu báo giá",
    secondaryCta: "Xem quy cách sản phẩm",
    packAlt: "Lốc giấy vệ sinh Uni-Green",
  },
  specStrip: {
    basisWeight: "Định lượng",
    plies: "Số lớp",
    rollLength: "Chiều dài cuộn",
    moq: "Đặt hàng tối thiểu",
    standard: "Tiêu chuẩn",
    label: "Thông số sản xuất",
  },
  products: {
    eyebrow: "Danh mục",
    title: "Sản phẩm đang sản xuất",
    viewAll: "Xem toàn bộ danh mục",
    emptyTitle: "Chưa có sản phẩm nào",
    emptyBody: "Danh mục đang được cập nhật. Gửi yêu cầu để nhận bảng quy cách đầy đủ.",
    emptyCta: "Gửi yêu cầu",
    moq: "Tối thiểu",
    cartons: "thùng",
    coreless: "Không lõi",
    oemBadge: "Nhận OEM",
    imagePending: "Ảnh sản phẩm đang cập nhật",
    lines: {
      mega: "Dòng Mega Roll",
      family: "Dòng gia đình",
      tissue: "Dòng bán lẻ",
      oem: "Nhãn riêng",
    },
  },
  oem: {
    eyebrow: "Nhãn riêng",
    title: "Gia công theo thương hiệu của bạn",
    lead: "Chúng tôi cung cấp cuộn giấy màng trơn không in, hoặc sản xuất trọn gói theo thiết kế bao bì của bạn.",
    steps: [
      {
        title: "Gửi yêu cầu quy cách",
        body: "Định lượng, số lớp, chiều dài cuộn, số cuộn mỗi lốc và sản lượng dự kiến.",
      },
      {
        title: "Nhận mẫu và báo giá",
        body: "Mẫu vật lý gửi trong 7 ngày làm việc. Báo giá kèm điều kiện giao hàng.",
      },
      {
        title: "Duyệt in và sản xuất",
        body: "Duyệt file dieline, in màng, chạy đơn. Tối thiểu 400 thùng mỗi mã.",
      },
    ],
    cta: "Trao đổi về đơn OEM",
  },
  capability: {
    eyebrow: "Năng lực",
    title: "Chứng nhận và tiêu chuẩn",
    lead: "Sản xuất tại Công ty TNHH Uni Sơn Hà, khu đô thị Nam Định Điền, phường Lam Sơn, thành phố Hưng Yên.",
    certifications: [
      { code: "ISO 9001:2015", label: "Hệ thống quản lý chất lượng" },
      { code: "ISO 14001:2015", label: "Hệ thống quản lý môi trường" },
      { code: "TCCS 620:2020", label: "Tiêu chuẩn cơ sở" },
      { code: "OBA free", label: "Không chất tăng trắng quang học" },
    ],
  },
  inquiry: {
    title: "Cần báo giá cho đơn hàng cụ thể?",
    body: "Chọn sản phẩm, nhập sản lượng và địa điểm giao hàng. Chúng tôi phản hồi trong một ngày làm việc.",
    cta: "Tạo yêu cầu báo giá",
    orCall: "hoặc gọi",
  },
  footer: {
    company: "Công ty TNHH Uni Sơn Hà",
    address: "Số 80 Lương Ngọc Quyến, KĐT Nam Định Điền, phường Lam Sơn, TP Hưng Yên",
    hotline: "0966 986 558",
    web: "unisonha.com",
    rights: "Bản quyền thuộc Công ty TNHH Uni Sơn Hà.",
  },
};

const en: Dictionary = {
  nav: {
    products: "Products",
    oem: "OEM",
    capability: "Capability",
    contact: "Contact",
    inquiry: "Request quotation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    switchLocale: "Switch to Vietnamese",
    callUs: "Call hotline",
    skipToContent: "Skip to main content",
    home: "Home",
  },
  notFound: {
    title: "Page not found",
    body: "This address does not exist, or it has moved.",
    cta: "Back to home",
  },
  hero: {
    eyebrow: "Tissue paper mill · Hung Yen, Vietnam",
    headline: "Coreless bathroom tissue,",
    headlineAccent: "made to spec.",
    lead: "Imported virgin pulp, Japanese converting technology, produced to TCCS 620:2020. Private label from 400 cartons.",
    primaryCta: "Request quotation",
    secondaryCta: "View specifications",
    packAlt: "Uni-Green bathroom tissue pack",
  },
  specStrip: {
    basisWeight: "Basis weight",
    plies: "Plies",
    rollLength: "Roll length",
    moq: "Minimum order",
    standard: "Standard",
    label: "Production specifications",
  },
  products: {
    eyebrow: "Catalogue",
    title: "Current production range",
    viewAll: "View full catalogue",
    emptyTitle: "No products listed",
    emptyBody:
      "The catalogue is being updated. Send an inquiry to receive the full specification sheet.",
    emptyCta: "Send inquiry",
    moq: "MOQ",
    cartons: "ctn",
    coreless: "Coreless",
    oemBadge: "OEM ready",
    imagePending: "Pack shot pending",
    lines: {
      mega: "Mega roll line",
      family: "Family line",
      tissue: "Retail line",
      oem: "Private label",
    },
  },
  oem: {
    eyebrow: "Private label",
    title: "Manufactured under your brand",
    lead: "We supply unprinted rolls in plain film, or run the complete pack to your own artwork.",
    steps: [
      {
        title: "Send your specification",
        body: "Basis weight, plies, roll length, rolls per pack and expected annual volume.",
      },
      {
        title: "Receive samples and pricing",
        body: "Physical samples within 7 working days. Quotation includes delivery terms.",
      },
      {
        title: "Approve artwork and run",
        body: "Dieline approval, film printing, production. Minimum 400 cartons per SKU.",
      },
    ],
    cta: "Discuss an OEM order",
  },
  capability: {
    eyebrow: "Capability",
    title: "Certifications and standards",
    lead: "Manufactured by Uni Son Ha Co. Ltd, Nam Dinh Dien urban area, Lam Son ward, Hung Yen city.",
    certifications: [
      { code: "ISO 9001:2015", label: "Quality management system" },
      { code: "ISO 14001:2015", label: "Environmental management system" },
      { code: "TCCS 620:2020", label: "Manufacturer standard" },
      { code: "OBA free", label: "No optical brightening agents" },
    ],
  },
  inquiry: {
    title: "Need pricing for a specific order?",
    body: "Select products, enter volumes and delivery location. We respond within one working day.",
    cta: "Build a quotation request",
    orCall: "or call",
  },
  footer: {
    company: "Uni Son Ha Co. Ltd",
    address: "80 Luong Ngoc Quyen, Nam Dinh Dien, Lam Son ward, Hung Yen city, Vietnam",
    hotline: "+84 966 986 558",
    web: "unisonha.com",
    rights: "Copyright Uni Son Ha Co. Ltd.",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { vi, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
