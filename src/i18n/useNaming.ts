import { useEffect, useSyncExternalStore } from "react";
import { Naming } from "./naming";

export function useNaming() {
  // garante init uma vez, mas já foi chamado no main.tsx
  useEffect(() => {
    Naming.init();
  }, []);

  // faz componentes re-renderizarem quando Naming.setLang for chamado
  useSyncExternalStore(
    (cb) => Naming.subscribe(cb),
    () => Naming.getLang()
  );

  return Naming;
}
