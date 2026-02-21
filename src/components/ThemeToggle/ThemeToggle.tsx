import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useUiStore } from "../../store/ui.store";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <button className={styles.button} onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">
      {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  );
}
