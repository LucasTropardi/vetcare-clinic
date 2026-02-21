import { create } from "zustand";

export type MessageVariant = "info" | "success" | "warning" | "error";

type MessageOptions = {
  title?: string;
  message: string;
  closeText?: string;
  variant?: MessageVariant;
};

type MessageState = {
  open: boolean;
  options: MessageOptions | null;
  show: (options: MessageOptions) => void;
  close: () => void;
};

export const useMessageStore = create<MessageState>((set) => ({
  open: false,
  options: null,
  show: (options) => set({ open: true, options }),
  close: () => set({ open: false, options: null }),
}));

export const showMessage = (options: MessageOptions) => {
  useMessageStore.getState().show(options);
};
