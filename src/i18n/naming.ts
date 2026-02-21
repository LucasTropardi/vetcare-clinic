import { pt } from "./pt";
import { en } from "./en";
import { es } from "./es";

export type Lang = "pt" | "en" | "es";
type Dict = typeof pt | typeof en | typeof es;

const STORAGE_KEY = "vetcare-clinic:lang";

function getSavedLang(): Lang {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "es" || v === "pt" ? v : "pt";
}

function format(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

function deepGet(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}

export class Naming {
  private static lang: Lang = "pt";
  private static dicts: Record<Lang, Dict> = { pt, en, es };

  // listeners para React se atualizar quando trocar idioma
  private static listeners = new Set<() => void>();

  static init() {
    Naming.lang = getSavedLang();
  }

  static getLang(): Lang {
    return Naming.lang;
  }

  static setLang(lang: Lang) {
    Naming.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    Naming.listeners.forEach((fn) => fn());
  }

  static subscribe(fn: () => void) {
    Naming.listeners.add(fn);
    return () => Naming.listeners.delete(fn);
  }

  // Base: pegar por caminho ex: "auth.title" / "fields.email"
  static t(path: string, params?: Record<string, string | number>) {
    const primary = Naming.dicts[Naming.lang];
    const fallback = Naming.dicts.pt;

    const val =
      deepGet(primary, path) ??
      deepGet(fallback, path) ??
      path;

    return typeof val === "string" ? format(val, params) : path;
  }

  // Helpers
  static getField(key: keyof Dict["fields"]) {
    return Naming.t(`fields.${String(key)}`);
  }

  static getMessage(key: keyof Dict["messages"], params?: Record<string, string | number>) {
    return Naming.t(`messages.${String(key)}`, params);
  }

  static getTitle(key: keyof Dict["titles"], params?: Record<string, string | number>) {
    return Naming.t(`titles.${String(key)}`, params);
  }

  static getAuth(key: keyof Dict["auth"], params?: Record<string, string | number>) {
    return Naming.t(`auth.${String(key)}`, params);
  }

  static getLabel(key: keyof Dict["labels"], params?: Record<string, string | number>) {
    return Naming.t(`labels.${String(key)}`, params);
  }

  static getPlaceholder(key: keyof Dict["placeholders"], params?: Record<string, string | number>) {
    return Naming.t(`placeholders.${String(key)}`, params);
  }

  static getRole(key: keyof Dict["roles"], params?: Record<string, string | number>) {
    return Naming.t(`roles.${String(key)}`, params);
  }

  static getAction(key: keyof Dict["actions"], params?: Record<string, string | number>) {
    return Naming.t(`actions.${String(key)}`, params);
  }

  static getApp(key: keyof Dict["app"]) {
    if (key === "name") {
      const envName = import.meta.env.VITE_APP_NAME as string | undefined;
      if (envName && envName.trim()) return envName.trim();
    }
    return Naming.t(`app.${String(key)}`);
  }
}
