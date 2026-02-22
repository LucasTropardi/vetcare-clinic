import { http } from "./http";
import type { PageResponse, UserResponseWithRole } from "./types";

export async function getMe(): Promise<UserResponseWithRole> {
  const { data } = await http.get<UserResponseWithRole>("/api/users/me");
  return data;
}

export async function listUsers(params?: {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  active?: boolean;
  role?: "ADMIN" | "VET" | "RECEPTION";
}): Promise<PageResponse<UserResponseWithRole>> {
  const { data } = await http.get<PageResponse<UserResponseWithRole>>("/api/users", { params });
  return data;
}
