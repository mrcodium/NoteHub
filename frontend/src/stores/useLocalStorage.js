// stores/useLocalStorage.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useLocalStorage = create(
  persist(
    (set, get) => ({
      // Search history state
      searchHistory: [],
      addSearchHistory: (user) => {
        const newHistory = [
          user,
          ...get().searchHistory.filter((item) => item._id !== user._id),
        ].slice(0, 5);
        set({ searchHistory: newHistory });
      },
      removeSearchHistory: (userId) => {
        set({
          searchHistory: get().searchHistory.filter((item) => item._id !== userId),
        });
      },
      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      // Collections state
      openedCollections: {},
      toggleCollection: (collectionId, isExpanded) => {
        set({
          openedCollections: {
            ...get().openedCollections,
            [collectionId]: isExpanded,
          },
        });
      },
      collapseAll: () => {
        set({ openedCollections: {} });
      },
      expandAll: (collectionIds) => {
        const expandedState = collectionIds.reduce(
          (acc, id) => ({ ...acc, [id]: true }),
          {}
        );
        set({ openedCollections: expandedState });
      },

      // Pinned collections
      pinnedCollections: [],
      togglePinnedCollection: (collectionId) => {
        const { pinnedCollections } = get();
        set({
          pinnedCollections: pinnedCollections.includes(collectionId)
            ? pinnedCollections.filter((id) => id !== collectionId)
            : [...pinnedCollections, collectionId],
        });
      },

      // Theme state
      theme: "zinc",
      setTheme: (newTheme) => {
        set({ theme: newTheme });
        document.documentElement.setAttribute("data-theme", newTheme.toLowerCase());
      },
    }),
    {
      name: "local-storage-state",
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    }
  )
);