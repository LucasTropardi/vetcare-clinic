import { useEffect } from "react";
import axios from "axios";
import { setLastAuthFailure } from "./auth/authFailure";
import { useAuth } from "react-oidc-context";
import { extractRoles } from "./auth/roles";
import { setAccessToken } from "./auth/tokenStore";
import { getApiErrorMessage } from "./services/api/errors";
import { getMe } from "./services/api/users.service";
import { useAuthStore } from "./store/auth.store";

export function AuthBootstrap() {
  const setMe = useAuthStore((s) => s.setMe);
  const setOidcUser = useAuthStore((s) => s.setOidcUser);
  const clearAuthState = useAuthStore((s) => s.clearAuthState);
  const auth = useAuth();

  useEffect(() => {
    const token = auth.user?.access_token ?? null;
    setAccessToken(token);

    if (!auth.isAuthenticated || !auth.user?.profile?.sub) {
      setMe(null);
      setOidcUser(null);
      return;
    }

    setOidcUser({
      sub: auth.user.profile.sub,
      email: (auth.user.profile.email as string | undefined) ?? null,
      name: (auth.user.profile.name as string | undefined) ?? null,
      roles: extractRoles(auth.user.profile as Record<string, unknown>),
    });

    getMe()
      .then(setMe)
      .catch(async (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const apiMessage = getApiErrorMessage(error);
          const detail = apiMessage ?? error.message ?? "unknown";
          setLastAuthFailure(`Falha em /api/users/me (${status ?? "sem status"}): ${detail}`);
        } else if (error instanceof Error) {
          setLastAuthFailure(`Falha em /api/users/me: ${error.message}`);
        } else {
          setLastAuthFailure("Falha em /api/users/me: erro desconhecido");
        }

        setMe(null);
        setAccessToken(null);
        clearAuthState();
        await auth.removeUser();
      });
  }, [auth.isAuthenticated, auth.user?.access_token, auth, setMe, setOidcUser, clearAuthState]);

  return null;
}
