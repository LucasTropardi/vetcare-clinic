import { http } from "./http";
import type { PageResponse, ProductListItemResponse } from "./types";

export async function listProducts(params?: {
  page?: number;
  size?: number;
  sort?: string;
  name?: string;
  active?: boolean;
}): Promise<PageResponse<ProductListItemResponse>> {
  const { data } = await http.get<PageResponse<ProductListItemResponse>>("/api/products", { params });
  return data;
}
