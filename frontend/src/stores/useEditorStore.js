import { create } from "zustand";

export const useEditorStore = create((set) => ({
  openImageDialog: false,
  openMathDialog: false,
  openLinkDialog: false,
  scrollRef: null,

  editorFontFamily: localStorage.getItem("editorFontFamily") || "Roboto",

  setFontFamily: (font) => {
    localStorage.setItem("editorFontFamily", font);
    set({ editorFontFamily: font });
  },

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
