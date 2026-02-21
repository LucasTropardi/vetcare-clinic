import { Outlet } from "react-router-dom";
import { Navbar } from "../../components/Navbar/Navbar";
import styles from "./AuthLayout.module.css";

export function AuthLayout() {
  return (
    <div className={styles.page}>
      <Navbar showMenuButton={false} title="VetCare Clinic" />
      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
