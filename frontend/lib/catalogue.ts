export type Locale = "vi" | "en";

export type SkuLine = "mega" | "family" | "tissue" | "oem";

export interface ProductSpec {
  /** Basis weight in g/m². */
  readonly basisWeight: number;
  /** Sheet size, millimetres. */
  readonly sheetWidthMm: number;
  readonly sheetHeightMm: number;
  readonly plies: number;
  readonly rollsPerPack: number;
  /** Metres per roll. Null where the pack is sold by sheet count instead. */
  readonly metresPerRoll: number | null;
  readonly coreless: boolean;
}

export interface ProductPacking {
  readonly minOrderCartons: number;
  readonly packsPerCarton: number;
  /** Cartons per 40ft high-cube container. */
  readonly cartonsPer40hc: number;
}

export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly line: SkuLine;
  readonly barcode: string | null;
  /** Pack shot exported from the print dieline. Null until artwork is exported. */
  readonly imageSrc: string | null;
  readonly name: Record<Locale, string>;
  readonly summary: Record<Locale, string>;
  readonly spec: ProductSpec;
  readonly packing: ProductPacking;
  readonly oemAvailable: boolean;
}

export const PRODUCTS: readonly Product[] = [
  {
    id: "ug-mr-6",
    sku: "UG-MR-6",
    line: "mega",
    barcode: "8938527193153",
    imageSrc: null,
    name: {
      vi: "Ultra Soft Mega Roll",
      en: "Ultra Soft Mega Roll",
    },
    summary: {
      vi: "6 cuộn mega tương đương 12 cuộn thường. Bột giấy nguyên sinh nhập khẩu.",
      en: "6 mega rolls equal to 12 regular rolls. Imported virgin pulp.",
    },
    spec: {
      basisWeight: 15,
      sheetWidthMm: 95,
      sheetHeightMm: 120,
      plies: 2,
      rollsPerPack: 6,
      metresPerRoll: 80,
      coreless: true,
    },
    packing: { minOrderCartons: 200, packsPerCarton: 8, cartonsPer40hc: 1120 },
    oemAvailable: true,
  },
  {
    id: "ug-3p-10",
    sku: "UG-3P-10",
    line: "family",
    barcode: "8938527193016",
    imageSrc: null,
    name: {
      vi: "Giấy vệ sinh 10 cuộn",
      en: "Bathroom tissue, 10 rolls",
    },
    summary: {
      vi: "10 cuộn 3 lớp, không lõi. Dòng gia đình, phân phối siêu thị.",
      en: "10 rolls, 3 ply, coreless. Family line for supermarket distribution.",
    },
    spec: {
      basisWeight: 14,
      sheetWidthMm: 95,
      sheetHeightMm: 110,
      plies: 3,
      rollsPerPack: 10,
      metresPerRoll: 40,
      coreless: true,
    },
    packing: { minOrderCartons: 150, packsPerCarton: 6, cartonsPer40hc: 980 },
    oemAvailable: true,
  },
  {
    id: "ug-3p-12",
    sku: "UG-3P-12",
    line: "tissue",
    barcode: "8938527191539",
    imageSrc: null,
    name: {
      vi: "Bathroom Tissue 12 cuộn",
      en: "Bathroom tissue, 12 rolls",
    },
    summary: {
      vi: "12 cuộn x 40 mét, 3 lớp. Quy cách bán lẻ tiêu chuẩn.",
      en: "12 rolls x 40 m, 3 ply. Standard retail format.",
    },
    spec: {
      basisWeight: 13,
      sheetWidthMm: 95,
      sheetHeightMm: 110,
      plies: 3,
      rollsPerPack: 12,
      metresPerRoll: 40,
      coreless: false,
    },
    packing: { minOrderCartons: 150, packsPerCarton: 6, cartonsPer40hc: 900 },
    oemAvailable: true,
  },
  {
    id: "ug-oem-6",
    sku: "UG-OEM-6",
    line: "oem",
    barcode: null,
    imageSrc: null,
    name: {
      vi: "Cuộn không lõi, màng trơn",
      en: "Coreless bulk pack, plain film",
    },
    summary: {
      vi: "6 cuộn, màng trơn không in. Dành cho gia công nhãn riêng.",
      en: "6 rolls in unprinted film. Supplied for private-label converting.",
    },
    spec: {
      basisWeight: 15,
      sheetWidthMm: 95,
      sheetHeightMm: 120,
      plies: 2,
      rollsPerPack: 6,
      metresPerRoll: 80,
      coreless: true,
    },
    packing: { minOrderCartons: 400, packsPerCarton: 8, cartonsPer40hc: 1180 },
    oemAvailable: true,
  },
];

export function getFeaturedProducts(limit = 4): readonly Product[] {
  return PRODUCTS.slice(0, limit);
}
