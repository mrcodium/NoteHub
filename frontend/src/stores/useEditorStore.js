import { create } from "zustand";

export const useEditorStore = create((set, get) => ({
  openImageDialog: false,
  openMathDialog: false,
  openLinkDialog: false,
  scrollRef: null,
  
  setScrollRef: (ref) => set({ scrollRef: ref }),
  openDialog: (dialog) => set({ [dialog]: true }),
  closeDialog: (dialog) => set({ [dialog]: false }),

  closeAllDialogs: () =>
    set({
      openImageDialog: false,
      openMathDialog: false,
      openLinkDialog: false,
    }),
}));
