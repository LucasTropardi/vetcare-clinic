import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  GearIcon,
  PackageIcon,
  PawPrintIcon,
  SignOutIcon,
  StethoscopeIcon,
  UserCircleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { BrandLogo } from "../brand/BrandLogo";
import { useUiStore } from "../../store/ui.store";
import { useAuthStore } from "../../store/auth.store";
import { useNaming } from "../../i18n/useNaming";
import { useConfirmStore } from "../../store/confirm.store";
import { showMessage } from "../../store/message.store";
import styles from "./Sidebar.module.css";

const MOBILE_BREAKPOINT = 900;

function isMobileNow() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

export function Sidebar() {
  const naming = useNaming();
  const navigate = useNavigate();
  const auth = useAuth();

  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const me = useAuthStore((s) => s.me);
  const clearAuthState = useAuthStore((s) => s.clearAuthState);
  const confirm = useConfirmStore((s) => s.confirm);

  useEffect(() => {
    const handler = () => toggle();
    window.addEventListener("clinic:toggle-sidebar", handler as EventListener);
    return () => window.removeEventListener("clinic:toggle-sidebar", handler as EventListener);
  }, [toggle]);

  function closeSidebarOnMobile() {
    if (!isMobileNow()) return;
    setCollapsed(true);
  }

  const items = [
    { to: "/", label: naming.t("agenda.title"), icon: <CalendarDotsIcon size={18} /> },
    { to: "/atendimentos", label: "Atendimentos", icon: <StethoscopeIcon size={18} /> },
    { to: "/prontuarios", label: "Prontuários", icon: <ClipboardTextIcon size={18} /> },
    { to: "/estoque-insumos", label: "Consulta de estoque", icon: <PackageIcon size={18} /> },
    { to: "/pacientes", label: "Pacientes", icon: <PawPrintIcon size={18} /> },
    { to: "/tutores", label: "Tutores", icon: <UsersIcon size={18} /> },
    { to: "/config", label: "Config", icon: <GearIcon size={18} /> },
  ];

  async function handleLogout() {
    const ok = await confirm({
      title: naming.getLabel("sair"),
      message: naming.getMessage("encerrarSessaoConfirm"),
      confirmText: naming.getLabel("sair"),
      cancelText: naming.getLabel("cancel"),
      danger: true,
    });

    if (!ok) return;

    try {
      await auth.signoutRedirect();
    } catch {
      await auth.removeUser();
      clearAuthState();
      navigate("/login", { replace: true });
      showMessage({
        title: naming.getLabel("sair"),
        message: naming.getMessage("logoutFallback"),
        variant: "warning",
      });
    }
  }

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        <div className={styles.header}>
          <button className={styles.logoButton} onClick={toggle} aria-label="Alternar sidebar">
            <BrandLogo height={36} />
          </button>
          {!collapsed && <span className={styles.title}>Clinic</span>}
        </div>

        <div className={styles.menuArea}>
          <nav className={styles.nav}>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebarOnMobile}
                className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.footer}>
          <div className={styles.userRow}>
            <div className={styles.userInfo} title={me?.email ?? naming.getMessage("emailNotAvailable")}>
              <UserCircleIcon size={28} />
              {!collapsed && (
                <div className={styles.userMeta}>
                  <div className={styles.userName}>{me?.name ?? naming.getTitle("user")}</div>
                  <div className={styles.userEmail}>{me?.email ?? naming.getMessage("emailNotAvailable")}</div>
                </div>
              )}
            </div>
            <button className={styles.logoutIconButton} onClick={handleLogout} title={naming.getLabel("sair")} aria-label={naming.getLabel("sair")}>
              <SignOutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {!collapsed && isMobileNow() && <button className={styles.backdrop} onClick={() => setCollapsed(true)} aria-label="Fechar menu" />}
    </>
  );
}
