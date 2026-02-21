import { create } from "zustand";
import type { Role, UserResponseWithRole } from "../services/api/types";

export type OidcUserSummary = {
  sub: string;
  email: string | null;
  name: string | null;
  roles: Role[];
};

type AuthState = {
  me: UserResponseWithRole | null;
  oidcUser: OidcUserSummary | null;

  setMe: (me: UserResponseWithRole | null) => void;
  setOidcUser: (oidcUser: OidcUserSummary | null) => void;
  clearAuthState: () => void;
};

const STORAGE_KEY = "vetcare-clinic:auth";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { me: null, oidcUser: null };

    const parsed = JSON.parse(raw);
    return {
      me: parsed.me ?? null,
      oidcUser: parsed.oidcUser ?? null,
    };
  } catch {
    return { me: null, oidcUser: null };
  }
}

const initial = loadInitial();

export const useAuthStore = create<AuthState>((set, get) => ({
  me: initial.me,
  oidcUser: initial.oidcUser,

  setMe: (me) => {
    const current = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, me }));
    set({ me });
  },

  setOidcUser: (oidcUser) => {
    const current = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, oidcUser }));
    set({ oidcUser });
  },

  clearAuthState: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ me: null, oidcUser: null });
  },
}));

export const authStore = {
  getState: () => useAuthStore.getState(),
};
