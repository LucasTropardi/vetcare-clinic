import { useEffect, useRef } from "react";
import styles from "./ConfirmModal.module.css";
import { useConfirmStore } from "../../store/confirm.store";

export function ConfirmModalHost() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const close = useConfirmStore((s) => s.close);

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };

    document.addEventListener("keydown", onKeyDown);

    setTimeout(() => {
      const btn = panelRef.current?.querySelector<HTMLButtonElement>("button");
      btn?.focus();
    }, 0);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open || !options) return null;

  const {
    title = "Confirmar ação",
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    danger = false,
  } = options;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div className={styles.panel} ref={panelRef}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
        </div>

        <div className={styles.body}>{message}</div>

        <div className={styles.actions}>
          <button className={styles.btnGhost} onClick={() => close(false)}>
            {cancelText}
          </button>

          <button
            className={`${styles.btnPrimary} ${danger ? styles.btnDanger : ""}`}
            onClick={() => close(true)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
