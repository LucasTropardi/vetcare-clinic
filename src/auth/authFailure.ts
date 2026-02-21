const AUTH_FAILURE_KEY = "vetcare-clinic:last-auth-failure";

export function setLastAuthFailure(message: string) {
  sessionStorage.setItem(AUTH_FAILURE_KEY, message);
}

export function consumeLastAuthFailure(): string | null {
  const value = sessionStorage.getItem(AUTH_FAILURE_KEY);
  if (!value) return null;
  sessionStorage.removeItem(AUTH_FAILURE_KEY);
  return value;
}
