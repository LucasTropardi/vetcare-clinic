import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DateInputBR.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  inputClassName?: string;
};

function formatIsoToBr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeDigitsToBr(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrToIso(br: string): string | null {
  const digits = br.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const dd = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const yyyy = Number(digits.slice(4, 8));

  if (yyyy < 1900 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const candidate = new Date(yyyy, mm - 1, dd);
  if (
    candidate.getFullYear() !== yyyy ||
    candidate.getMonth() !== mm - 1 ||
    candidate.getDate() !== dd
  ) {
    return null;
  }

  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function DateInputBR({ value, onChange, id, ariaLabel, inputClassName }: Props) {
  const [text, setText] = useState(formatIsoToBr(value));
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const mergedInputClass = useMemo(
    () => `${styles.input} ${inputClassName ?? ""}`.trim(),
    [inputClassName]
  );

  useEffect(() => {
    setText(formatIsoToBr(value));
  }, [value]);

  return (
    <div className={styles.wrapper}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        placeholder="dd/mm/aaaa"
        className={mergedInputClass}
        value={text}
        onChange={(e) => {
          const next = normalizeDigitsToBr(e.target.value);
          setText(next);

          const parsed = parseBrToIso(next);
          if (parsed) onChange(parsed);
          if (!next) onChange("");
        }}
        onBlur={() => {
          const parsed = parseBrToIso(text);
          if (!parsed) setText(formatIsoToBr(value));
        }}
      />

      <button
        type="button"
        className={styles.calendarBtn}
        aria-label="Abrir calendário"
        onClick={() => {
          const el = hiddenRef.current;
          if (!el) return;
          if (typeof el.showPicker === "function") {
            el.showPicker();
            return;
          }
          el.focus();
          el.click();
        }}
      >
        <CalendarBlankIcon size={16} />
      </button>

      <input
        ref={hiddenRef}
        type="date"
        className={styles.hiddenDate}
        tabIndex={-1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
