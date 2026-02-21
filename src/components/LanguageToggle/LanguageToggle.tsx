import { Naming, type Lang } from "../../i18n/naming";
import { useNaming } from "../../i18n/useNaming";
import styles from "./LanguageToggle.module.css";

export function LanguageToggle() {
  const naming = useNaming();

  return (
    <select
      className={styles.select}
      value={naming.getLang()}
      onChange={(e) => Naming.setLang(e.target.value as Lang)}
      aria-label="Idioma"
    >
      <option value="pt">PT</option>
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}
