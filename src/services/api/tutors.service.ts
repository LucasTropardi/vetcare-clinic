import { http } from "./http";
import type { PageResponse, TutorListItemResponse, TutorStatsResponse } from "./types";

export async function listTutors(params?: {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  active?: boolean;
  hasCompany?: boolean;
  hasPet?: boolean;
  hasContact?: boolean;
}): Promise<PageResponse<TutorListItemResponse>> {
  const { data } = await http.get<PageResponse<TutorListItemResponse>>("/api/tutors", { params });
  return data;
}

export async function getTutorStats(): Promise<TutorStatsResponse> {
  const { data } = await http.get<TutorStatsResponse>("/api/tutors/stats");
  return data;
}
