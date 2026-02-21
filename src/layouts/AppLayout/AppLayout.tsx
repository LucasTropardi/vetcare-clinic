import { Outlet } from "react-router-dom";
import { Sidebar } from "../../components/Sidebar/Sidebar";
import { Navbar } from "../../components/Navbar/Navbar";
import { ConfirmModalHost } from "../../components/ConfirmModal/ConfirmModalHost";
import { MessageModalHost } from "../../components/MessageModal/MessageModalHost";
import styles from "./AppLayout.module.css";
import { useUiStore } from "../../store/ui.store";
import { useEffect } from "react";

export function AppLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 900px)");

    const apply = () => {
      if (mql.matches) {
        setCollapsed(true);
      }
    };

    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [setCollapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "88px" : "320px");
  }, [collapsed]);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Navbar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <ConfirmModalHost />
      <MessageModalHost />
    </div>
  );
}
