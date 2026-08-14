import type { Locale } from "./types";

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
    readonly manufacturing: string;
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
    manufacturing: "Sản xuất",
    oem: "OEM",
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
    eyebrow: "Danh mục sản phẩm song ngữ",
    headline: "Sản phẩm giấy tissue,",
    headlineAccent: "thông tin đã xác minh.",
    lead: "Khám phá danh mục đã được đội ngũ Uni-Green kiểm duyệt bằng tiếng Việt và tiếng Anh.",
    primaryCta: "Liên hệ — sắp ra mắt",
    secondaryCta: "Xem danh mục",
    packAlt: "Thông tin sản phẩm được kiểm duyệt trước khi xuất bản.",
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
    emptyBody: "Danh mục đang được cập nhật với nội dung đã được phê duyệt.",
    emptyCta: "Xem thông tin",
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
    lead: "Thông tin dịch vụ OEM sẽ được công bố sau khi hoàn tất kiểm duyệt.",
    steps: [
      {
        title: "Gửi yêu cầu quy cách",
        body: "Quy trình tiếp nhận thông số sẽ được xác nhận trước khi công bố.",
      },
      {
        title: "Nhận mẫu và báo giá",
        body: "Quy trình mẫu và báo giá sẽ được xác nhận trước khi công bố.",
      },
      {
        title: "Duyệt in và sản xuất",
        body: "Quy trình duyệt và sản xuất sẽ được xác nhận trước khi công bố.",
      },
    ],
    cta: "Trao đổi về đơn OEM",
  },
  capability: {
    eyebrow: "Năng lực",
    title: "Chứng nhận và tiêu chuẩn",
    lead: "Thông tin năng lực sẽ được công bố sau khi hoàn tất kiểm duyệt.",
    certifications: [],
  },
  inquiry: {
    title: "Cần trao đổi về sản phẩm?",
    body: "Luồng yêu cầu báo giá sẽ được bổ sung trong Sprint 2.",
    cta: "Xem thông tin sắp ra mắt",
    orCall: "",
  },
  footer: {
    company: "Danh mục sản phẩm Uni-Green",
    address: "",
    hotline: "",
    web: "",
    rights: "Thông tin công khai chỉ gồm nội dung đã được phê duyệt.",
  },
};

const en: Dictionary = {
  nav: {
    products: "Products",
    manufacturing: "Manufacturing",
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
    eyebrow: "Bilingual product catalogue",
    headline: "Tissue products,",
    headlineAccent: "with verified information.",
    lead: "Explore catalogue content reviewed by the Uni-Green team in Vietnamese and English.",
    primaryCta: "Contact — coming soon",
    secondaryCta: "View catalogue",
    packAlt: "Product information is reviewed before publication.",
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
    emptyBody: "The catalogue is being updated with approved content.",
    emptyCta: "View information",
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
    lead: "OEM service information will be published after review.",
    steps: [
      {
        title: "Send your specification",
        body: "The specification intake process will be confirmed before publication.",
      },
      {
        title: "Receive samples and pricing",
        body: "The sampling and quotation process will be confirmed before publication.",
      },
      {
        title: "Approve artwork and run",
        body: "The approval and production process will be confirmed before publication.",
      },
    ],
    cta: "Discuss an OEM order",
  },
  capability: {
    eyebrow: "Capability",
    title: "Certifications and standards",
    lead: "Capability information will be published after review.",
    certifications: [],
  },
  inquiry: {
    title: "Want to discuss a product?",
    body: "The quotation-request workflow is planned for Sprint 2.",
    cta: "View what is coming",
    orCall: "",
  },
  footer: {
    company: "Uni-Green product catalogue",
    address: "",
    hotline: "",
    web: "",
    rights: "Public information contains approved content only.",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { vi, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
