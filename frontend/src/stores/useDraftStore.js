import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useDraftStore = create(
  persist(
    (set, get) => ({
      drafts: {},

      // ✅ Get draft by noteId
      getDraft: (noteId) => {
        return get().drafts[noteId] || null;
      },

      // ✅ Set / update draft for a note
      setDraft: (noteId, data) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [noteId]: {
              ...state.drafts[noteId],
              ...data,
              updatedAt: Date.now(),
            },
          },
        })),

      // ✅ Clear draft after publish
      clearDraft: (noteId) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[noteId];
          return { drafts };
        }),
    }),
    {
      name: "notehub-drafts", // localStorage key
    }
  )
);
