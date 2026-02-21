function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const isAuthDevMode = parseBooleanFlag(import.meta.env.VITE_AUTH_DEV_MODE as string | undefined, false);
