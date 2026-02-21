import axios from "axios";

export function getApiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;

  const data = err.response?.data as any;

  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;

  return null;
}
