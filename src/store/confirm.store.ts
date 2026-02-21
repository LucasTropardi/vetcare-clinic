import { create } from "zustand";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions | null;

  _resolver: ((value: boolean) => void) | null;

  confirm: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
};

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  _resolver: null,

  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      const prev = get()._resolver;
      if (prev) prev(false);

      set({ open: true, options, _resolver: resolve });
    });
  },

  close: (result) => {
    const r = get()._resolver;
    if (r) r(result);
    set({ open: false, options: null, _resolver: null });
  },
}));

export const confirmDialog = (options: ConfirmOptions) =>
  useConfirmStore.getState().confirm(options);
