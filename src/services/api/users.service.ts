import { http } from "./http";
import type { UserResponseWithRole } from "./types";

export async function getMe(): Promise<UserResponseWithRole> {
  const { data } = await http.get<UserResponseWithRole>("/api/users/me");
  return data;
}
