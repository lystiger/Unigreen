import type { components } from "./schema";

export type Category = components["schemas"]["CategoryResponse"];
export type CategoryCreate = components["schemas"]["CategoryCreate"];
export type Media = components["schemas"]["MediaResponse"];
export type Product = components["schemas"]["ProductResponse"];
export type ProductCreate = components["schemas"]["ProductCreate"];
export type PublicCategory = components["schemas"]["PublicCategoryResponse"];
export type PublicProduct = Omit<
  components["schemas"]["PublicProductSummary"],
  "pack_options"
> & {
  pack_options?: string[];
};
export type PublicProductDetail = Omit<
  components["schemas"]["PublicProductDetail"],
  "pack_options"
> & {
  pack_options?: string[];
};
export type PublicProductPage = components["schemas"]["PublicProductPage"];
export type StaffIdentity = components["schemas"]["StaffIdentityResponse"];
export type InquiryStatus = components["schemas"]["InquiryStatus"];
export type StaffInquirySummary = components["schemas"]["StaffInquirySummaryResponse"];
export type StaffInquiryPage = components["schemas"]["StaffInquiryPage"];
export type StaffInquiryDetail = components["schemas"]["StaffInquiryDetailResponse"];
export type StaffInquiryLine = components["schemas"]["StaffInquiryLineResponse"];
export type InquiryInternalNote = components["schemas"]["InquiryInternalNoteResponse"];
export type StaffSummary = components["schemas"]["StaffSummaryResponse"];
export type CanonicalProduct = components["schemas"]["CanonicalProductResponse"];
export type CanonicalProductDraft = components["schemas"]["CanonicalProductDraft"];
export type ProductMapRequest = components["schemas"]["ProductMapRequest"];
