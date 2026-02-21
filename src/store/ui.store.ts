import { create } from "zustand";

export type Theme = "light" | "dark";

type UiState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  setSidebarCollapsed: (value: boolean) => void;

  meModalOpen: boolean;
  setMeModalOpen: (value: boolean) => void;
};

const STORAGE_THEME = "vetcare-clinic:theme";

function applyThemeToDom(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_THEME);
  return saved === "dark" || saved === "light" ? saved : "light";
}

export const useUiStore = create<UiState>((set, get) => {
  const initialTheme = getInitialTheme();

  // aplica no carregamento
  if (typeof document !== "undefined") {
    applyThemeToDom(initialTheme);
  }

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      localStorage.setItem(STORAGE_THEME, theme);
      applyThemeToDom(theme);
      set({ theme });
    },
    toggleTheme: () => {
      const next: Theme = get().theme === "light" ? "dark" : "light";
      get().setTheme(next);
    },

    sidebarCollapsed: false,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

    meModalOpen: false,
    setMeModalOpen: (value) => set({ meModalOpen: value }),
  };
});
