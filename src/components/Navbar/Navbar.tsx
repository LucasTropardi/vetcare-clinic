import { ListIcon } from "@phosphor-icons/react";
import { LanguageToggle } from "../LanguageToggle/LanguageToggle";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./Navbar.module.css";

type NavbarProps = {
  showMenuButton?: boolean;
  title?: string;
};

export function Navbar({ showMenuButton = true, title = "VetCare Clinic" }: NavbarProps) {
  // const erpUrl = import.meta.env.VITE_ERP_URL ?? "http://localhost:5173";

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {showMenuButton && (
          <button
            className={styles.iconButton}
            onClick={() => {
              const event = new CustomEvent("clinic:toggle-sidebar");
              window.dispatchEvent(event);
            }}
            aria-label="Menu"
            title="Menu"
          >
            <ListIcon size={18} />
          </button>
        )}
        <span className={styles.brandText}>{title}</span>
      </div>

      <div className={styles.right}>
        <LanguageToggle />
        <ThemeToggle />
        {/* <a className={styles.erpLink} href={erpUrl} target="_blank" rel="noreferrer">
          <ArrowSquareOutIcon size={18} />
          <span>Voltar ao ERP</span>
        </a> */}
      </div>
    </header>
  );
}
