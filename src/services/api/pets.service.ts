import { http } from "./http";
import type { PageResponse, PetListItemResponse } from "./types";

export async function listPets(params?: {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  active?: boolean;
}): Promise<PageResponse<PetListItemResponse>> {
  const { data } = await http.get<PageResponse<PetListItemResponse>>("/api/pets", { params });
  return data;
}
