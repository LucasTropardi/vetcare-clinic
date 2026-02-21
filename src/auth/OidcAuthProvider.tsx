import type { PropsWithChildren } from "react";
import type { User } from "oidc-client-ts";
import { AuthProvider } from "react-oidc-context";
import { oidcConfig } from "./oidc";

function onSigninCallback(user?: User) {
  const state = user?.state as { returnTo?: string } | undefined;
  const returnTo = state?.returnTo ?? "/";
  window.history.replaceState({}, document.title, returnTo);
}

export function OidcAuthProvider({ children }: PropsWithChildren) {
  return (
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      {children}
    </AuthProvider>
  );
}
