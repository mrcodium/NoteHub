import { create } from "zustand";

export const FONT_PRESETS = {
  original: "Roboto, sans-serif",
  classic: '"Merriweather", serif',
  bookish: '"Source Serif 4", serif',
};

export const FONT_SIZE = [
  { value: 0, label: "Small", size: "14px" },
  { value: 1, label: "Medium", size: "16px" },
  { value: 2, label: "Large", size: "18px" },
  { value: 3, label: "Extra Large", size: "20px" },
  { value: 4, label: "Huge", size: "22px" },
];

export const useEditorStore = create((set) => ({
  openImageDialog: false,
  openMathDialog: false,
  openLinkDialog: false,
  scrollRef: null,

  editorFontSizeIndex: Number(localStorage.getItem("editorFontSizeIndex") ?? 1),
  editorFontSize: localStorage.getItem("editorFontSize") || FONT_SIZE.medium,
  editorFontFamily: localStorage.getItem("editorFontFamily") || "Roboto",

  setFontSize: (index) => {
    localStorage.setItem("editorFontSizeIndex", index);
    set({ editorFontSizeIndex: index });
  },

  setFontFamily: (size) => {
    localStorage.setItem("editorFontFamily", size);
    set({ editorFontFamily: size });
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
