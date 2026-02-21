import { useEffect } from "react";
import { useNaming } from "../../i18n/useNaming";
import styles from "./PlaceholderPage.module.css";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const naming = useNaming();

  useEffect(() => {
    document.title = `${title} • ${naming.getApp("name")}`;
  }, [title, naming]);

  return (
    <section className={styles.page}>
      <h1>{title}</h1>
      <p>Módulo em construção para o VetCare Clinic.</p>
    </section>
  );
}
