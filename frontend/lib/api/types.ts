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
