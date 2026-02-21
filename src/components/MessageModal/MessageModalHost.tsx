import { useEffect, useRef } from "react";
import { WarningCircleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMessageStore } from "../../store/message.store";
import styles from "./MessageModal.module.css";

export function MessageModalHost() {
  const open = useMessageStore((s) => s.open);
  const options = useMessageStore((s) => s.options);
  const close = useMessageStore((s) => s.close);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    setTimeout(() => {
      const btn = panelRef.current?.querySelector<HTMLButtonElement>("button");
      btn?.focus();
    }, 0);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open || !options) return null;

  const { title = "Mensagem", message, closeText = "Fechar", variant = "info" } = options;

  const icon =
    variant === "success" ? <CheckCircleIcon size={20} /> :
    variant === "warning" ? <WarningCircleIcon size={20} /> :
    variant === "error" ? <XCircleIcon size={20} /> :
    <InfoIcon size={20} />;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={styles.panel} ref={panelRef}>
        <div className={styles.header}>
          <div className={`${styles.icon} ${styles[variant]}`}>{icon}</div>
          <div className={styles.title}>{title}</div>
        </div>

        <div className={styles.body}>{message}</div>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={close}>{closeText}</button>
        </div>
      </div>
    </div>
  );
}
