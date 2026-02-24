import { http } from "./http";
import type { PageResponse, PetListItemResponse, PetStatsResponse } from "./types";

export async function listPets(params?: {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  tutorId?: number;
  active?: boolean;
  species?: "DOG" | "CAT";
  othersSpecies?: boolean;
}): Promise<PageResponse<PetListItemResponse>> {
  const { data } = await http.get<PageResponse<PetListItemResponse>>("/api/pets", { params });
  return data;
}

export async function getPetStats(): Promise<PetStatsResponse> {
  const { data } = await http.get<PetStatsResponse>("/api/pets/stats");
  return data;
}
