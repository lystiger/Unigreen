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
  readonly catalogue: {
    readonly eyebrow: string;
    readonly title: string;
    readonly search: string;
    readonly allCategories: string;
    readonly category: string;
    readonly sort: string;
    readonly featured: string;
    readonly name: string;
    readonly newest: string;
    readonly previous: string;
    readonly next: string;
    readonly page: string;
    readonly unavailable: string;
    readonly retry: string;
    /** Announced in the live region; `{count}` is substituted. */
    readonly resultCount: string;
    readonly resultCountFiltered: string;
    readonly noResults: string;
  };
  readonly productDetail: {
    readonly home: string;
    readonly products: string;
    readonly back: string;
    readonly specifications: string;
    readonly oem: string;
    readonly oemTag: string;
    readonly inquiry: string;
    readonly gallery: string;
    readonly unavailable: string;
    readonly retry: string;
    readonly standardNote: string;
    readonly relatedTitle: string;
    readonly viewDetail: string;
    readonly requestSpecSheet: string;
  };
  readonly basket: {
    readonly title: string;
    readonly open: string;
    readonly close: string;
    readonly badgeLabel: string;
    /** `{count}` is substituted. */
    readonly lineCount: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly emptyCta: string;
    readonly quantity: string;
    readonly unit: string;
    readonly unitCartons: string;
    readonly unitContainers: string;
    readonly note: string;
    readonly notePlaceholder: string;
    readonly add: string;
    readonly added: string;
    readonly increased: string;
    readonly remove: string;
    readonly removed: string;
    readonly capReached: string;
    readonly storageFull: string;
    readonly unavailable: string;
    readonly unavailableHint: string;
    readonly stale: string;
    readonly revalidating: string;
    readonly requestQuotation: string;
    readonly viewBasket: string;
    readonly continueShopping: string;
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
  catalogue: {
    eyebrow: "Danh mục đã xuất bản",
    title: "Sản phẩm",
    search: "Tìm theo tên, mô tả hoặc SKU",
    allCategories: "Tất cả danh mục",
    category: "Danh mục",
    sort: "Sắp xếp",
    featured: "Nổi bật",
    name: "Tên sản phẩm",
    newest: "Mới nhất",
    previous: "Trang trước",
    next: "Trang sau",
    page: "Trang",
    unavailable: "Không thể tải danh mục",
    retry: "Thử lại",
    resultCount: "{count} sản phẩm",
    resultCountFiltered: "{count} sản phẩm phù hợp với bộ lọc",
    noResults: "Không có sản phẩm phù hợp với bộ lọc",
  },
  productDetail: {
    home: "Trang chủ",
    products: "Sản phẩm",
    back: "Trở lại danh mục",
    specifications: "Thông số kỹ thuật chi tiết",
    oem: "Hỗ trợ gia công OEM / Thương hiệu riêng",
    oemTag: "Gia công OEM",
    inquiry: "Yêu cầu báo giá sản phẩm này",
    gallery: "Hình ảnh sản phẩm & chuyền may",
    unavailable: "Không thể tải sản phẩm",
    retry: "Thử lại",
    standardNote:
      "Sản phẩm được sản xuất trực tiếp tại xưởng Hưng Yên theo tiêu chuẩn chất lượng Nhật Bản.",
    relatedTitle: "Các dòng sản phẩm khác",
    viewDetail: "Xem chi tiết",
    requestSpecSheet: "Tải bảng thông số quy cách",
  },
  basket: {
    title: "Giỏ yêu cầu",
    open: "Mở giỏ yêu cầu",
    close: "Đóng giỏ yêu cầu",
    badgeLabel: "Giỏ yêu cầu",
    lineCount: "{count} dòng sản phẩm",
    emptyTitle: "Giỏ yêu cầu đang trống",
    emptyBody:
      "Thêm sản phẩm từ danh mục để yêu cầu báo giá cho cả đơn hàng, thay vì từng mã một.",
    emptyCta: "Xem danh mục",
    quantity: "Số lượng",
    unit: "Đơn vị",
    unitCartons: "Thùng",
    unitContainers: "Container 40HC",
    note: "Ghi chú",
    notePlaceholder: "Yêu cầu riêng cho dòng này",
    add: "Thêm vào giỏ",
    added: "Đã thêm vào giỏ yêu cầu",
    increased: "Đã tăng số lượng của sản phẩm có sẵn trong giỏ",
    remove: "Xoá khỏi giỏ",
    removed: "Đã xoá khỏi giỏ yêu cầu",
    capReached: "Giỏ yêu cầu chỉ chứa tối đa 40 dòng sản phẩm.",
    storageFull: "Không lưu được giỏ yêu cầu trên trình duyệt này.",
    unavailable: "Không còn được bán",
    unavailableHint: "Sản phẩm này đã ngừng xuất bản và sẽ không được gửi kèm yêu cầu.",
    stale: "Không kiểm tra được thông tin mới nhất. Số liệu hiển thị có thể đã cũ.",
    revalidating: "Đang kiểm tra danh mục…",
    requestQuotation: "Yêu cầu báo giá",
    viewBasket: "Xem giỏ yêu cầu",
    continueShopping: "Tiếp tục xem sản phẩm",
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
  catalogue: {
    eyebrow: "Published catalogue",
    title: "Products",
    search: "Search by name, summary or SKU",
    allCategories: "All categories",
    category: "Category",
    sort: "Sort",
    featured: "Featured",
    name: "Product name",
    newest: "Newest",
    previous: "Previous",
    next: "Next",
    page: "Page",
    unavailable: "Catalogue unavailable",
    retry: "Retry",
    resultCount: "{count} products",
    resultCountFiltered: "{count} products match your filters",
    noResults: "No products match your filters",
  },
  productDetail: {
    home: "Home",
    products: "Products",
    back: "Back to catalogue",
    specifications: "Detailed technical specifications",
    oem: "OEM / Private label manufacturing available",
    oemTag: "OEM Available",
    inquiry: "Request quotation for this product",
    gallery: "Product & line photography",
    unavailable: "Product unavailable",
    retry: "Retry",
    standardNote:
      "Manufactured on our production line in Hưng Yên, Vietnam under Japanese quality standards.",
    relatedTitle: "Other product families",
    viewDetail: "View details",
    requestSpecSheet: "Download specification sheet",
  },
  basket: {
    title: "Inquiry basket",
    open: "Open inquiry basket",
    close: "Close inquiry basket",
    badgeLabel: "Inquiry basket",
    lineCount: "{count} line items",
    emptyTitle: "Your inquiry basket is empty",
    emptyBody:
      "Add products from the catalogue to request pricing on a full order rather than one SKU at a time.",
    emptyCta: "Browse the catalogue",
    quantity: "Quantity",
    unit: "Unit",
    unitCartons: "Cartons",
    unitContainers: "40HC containers",
    note: "Note",
    notePlaceholder: "Anything specific to this line",
    add: "Add to basket",
    added: "Added to your inquiry basket",
    increased: "Increased the quantity of an item already in your basket",
    remove: "Remove from basket",
    removed: "Removed from your inquiry basket",
    capReached: "The inquiry basket holds at most 40 line items.",
    storageFull: "This browser could not save your inquiry basket.",
    unavailable: "No longer available",
    unavailableHint:
      "This product has been unpublished and will not be sent with your inquiry.",
    stale:
      "Could not check the catalogue for updates. Figures shown may be out of date.",
    revalidating: "Checking the catalogue\u2026",
    requestQuotation: "Request quotation",
    viewBasket: "View inquiry basket",
    continueShopping: "Continue browsing",
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
