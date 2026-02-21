import { WebStorageStateStore } from "oidc-client-ts";
import type { UserManagerSettings } from "oidc-client-ts";

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL as string | undefined;
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM as string | undefined;
const authority =
  (import.meta.env.VITE_OIDC_AUTHORITY as string | undefined) ??
  (keycloakUrl && keycloakRealm ? `${keycloakUrl.replace(/\/$/, "")}/realms/${keycloakRealm}` : undefined);
const clientId =
  (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ??
  (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined);
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined;
const fallbackAuthority = "http://localhost:8081/realms/vetcare";
const fallbackClientId = "vetcare-clinic";
const fallbackRedirectUri = `${window.location.origin}/login`;

function resolveEnv(name: string, value: string | undefined, fallback: string): string {
  if (!value) {
    console.warn(`[OIDC] Missing env var ${name}. Using fallback: ${fallback}`);
    return fallback;
  }
  return value;
}

export const oidcDiagnostics = {
  missingAuthority: !authority,
  missingClientId: !clientId,
  missingRedirectUri: !redirectUri,
  effectiveAuthority: authority ?? fallbackAuthority,
  effectiveClientId: clientId ?? fallbackClientId,
  effectiveRedirectUri: redirectUri ?? fallbackRedirectUri,
};

export const oidcConfig: UserManagerSettings = {
  authority: resolveEnv("VITE_OIDC_AUTHORITY/VITE_KEYCLOAK_URL+REALM", authority, fallbackAuthority),
  client_id: resolveEnv("VITE_OIDC_CLIENT_ID/VITE_KEYCLOAK_CLIENT_ID", clientId, fallbackClientId),
  redirect_uri: resolveEnv("VITE_OIDC_REDIRECT_URI", redirectUri, fallbackRedirectUri),
  post_logout_redirect_uri:
    (import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI as string | undefined) ??
    `${window.location.origin}/login`,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
};
