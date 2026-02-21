import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { BrandLogo } from "../../components/brand/BrandLogo";
import styles from "./LoginPage.module.css";
import { useNaming } from "../../i18n/useNaming";
import { consumeLastAuthFailure } from "../../auth/authFailure";
import { isAuthDevMode } from "../../auth/mode";
import { oidcDiagnostics } from "../../auth/oidc";

export function LoginPage() {
  const naming = useNaming();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const autoRedirectStarted = useRef(false);
  const hasMissingOidcEnv =
    oidcDiagnostics.missingAuthority || oidcDiagnostics.missingClientId || oidcDiagnostics.missingRedirectUri;

  useEffect(() => {
    document.title = `${naming.getAuth("title")} • ${naming.getApp("name")}`;
  }, [naming]);

  useEffect(() => {
    const lastFailure = consumeLastAuthFailure();
    if (lastFailure) setServerError(lastFailure);
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    navigate("/", { replace: true });
  }, [auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthDevMode) return;
    if (auth.isLoading || auth.isAuthenticated || autoRedirectStarted.current) return;
    autoRedirectStarted.current = true;
    const returnTo = searchParams.get("returnTo") ?? "/";
    void auth.signinRedirect({ state: { returnTo } });
  }, [auth.isLoading, auth.isAuthenticated, auth, searchParams]);

  async function handleSignIn() {
    setServerError(null);
    try {
      const returnTo = searchParams.get("returnTo") ?? "/";
      await auth.signinRedirect({ state: { returnTo } });
    } catch (error) {
      const details = error instanceof Error ? error.message : naming.getMessage("unknown");
      setServerError(`Falha ao iniciar SSO: ${details}`);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.brandArea}>
        <BrandLogo height={104} />
      </div>
      <h1 className={styles.title}>{naming.getAuth("title")}</h1>

      {!isAuthDevMode && (
        <div className={styles.serverError}>
          Redirecionando para autenticação...
          <br />
          Ative `VITE_AUTH_DEV_MODE=true` para usar botão manual no ambiente de desenvolvimento.
        </div>
      )}

      {hasMissingOidcEnv && (
        <div className={styles.serverError}>
          Configuração OIDC ausente em `.env`:
          <br />
          `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`
        </div>
      )}
      {auth.error && <div className={styles.serverError}>Erro OIDC: {auth.error.message}</div>}
      {serverError && <div className={styles.serverError}>{serverError}</div>}

      {isAuthDevMode && (
        <button className={styles.button} type="button" disabled={auth.isLoading} onClick={handleSignIn}>
          {auth.isLoading ? naming.getMessage("loading") : naming.getAuth("login")}
        </button>
      )}
    </div>
  );
}
