import type { Role } from "../services/api/types";

const APP_ROLES = new Set<Role>(["ADMIN", "VET", "RECEPTION"]);

type RealmAccess = { roles?: string[] };
type ResourceAccess = Record<string, { roles?: string[] }>;

export function extractRoles(claims: Record<string, unknown> | undefined): Role[] {
  if (!claims) return [];

  const result = new Set<Role>();

  const realmRoles = (claims.realm_access as RealmAccess | undefined)?.roles ?? [];
  for (const role of realmRoles) {
    const normalized = normalizeRole(role);
    if (normalized) result.add(normalized);
  }

  const resourceAccess = (claims.resource_access as ResourceAccess | undefined) ?? {};
  for (const clientRoles of Object.values(resourceAccess)) {
    for (const role of clientRoles.roles ?? []) {
      const normalized = normalizeRole(role);
      if (normalized) result.add(normalized);
    }
  }

  const directRoles = claims.roles;
  if (Array.isArray(directRoles)) {
    for (const role of directRoles) {
      const normalized = normalizeRole(String(role));
      if (normalized) result.add(normalized);
    }
  }

  return Array.from(result);
}

function normalizeRole(role: string): Role | null {
  const normalized = role.replace(/^ROLE_/, "").toUpperCase() as Role;
  return APP_ROLES.has(normalized) ? normalized : null;
}
