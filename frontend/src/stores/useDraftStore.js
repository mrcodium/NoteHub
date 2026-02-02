import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";

export const useDraftStore = create(
  persist(
    (set, get) => ({
      drafts: {}, // { [userId]: { [noteId]: draft } }

      // ✅ Get draft by noteId (auto use current user)
      getDraft: (noteId) => {
        const { authUser } = useAuthStore.getState();
        if (!authUser?._id) return null;
        return get().drafts[authUser._id]?.[noteId] || null;
      },

      // ✅ Set / update draft for a note (auto user)
      setDraft: (noteId, data) => {
        const { authUser } = useAuthStore.getState();
        if (!authUser?._id) return;
        const userId = authUser._id;

        set((state) => ({
          drafts: {
            ...state.drafts,
            [userId]: {
              ...state.drafts[userId],
              [noteId]: {
                ...state.drafts[userId]?.[noteId],
                ...data,
                updatedAt: Date.now(),
              },
            },
          },
        }));
      },

      // ✅ Clear draft after publish (auto user)
      clearDraft: (noteId) => {
        const { authUser } = useAuthStore.getState();
        if (!authUser?._id) return;
        const userId = authUser._id;

        set((state) => {
          if (!state.drafts[userId]) return state;
          const userDrafts = { ...state.drafts[userId] };
          delete userDrafts[noteId];

          return {
            drafts: {
              ...state.drafts,
              [userId]: userDrafts,
            },
          };
        });
      },

      // ✅ Clear all drafts for current user (logout)
      clearUserDrafts: () => {
        const { authUser } = useAuthStore.getState();
        if (!authUser?._id) return;
        const userId = authUser._id;

        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[userId];
          return { drafts };
        });
      },

      // ⚠️ Optional: wipe everything (dev / reset)
      clearAllDrafts: () => ({ drafts: {} }),
    }),
    {
      name: "notehub-drafts",
    },
  ),
);
