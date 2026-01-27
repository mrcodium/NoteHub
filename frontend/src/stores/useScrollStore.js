// stores/useScrollStore.js
import { create } from "zustand";

export const useScrollStore = create((set, get) => ({
  positions: {},
  save: (path, y) => {
    const current = get().positions[path];
    // Only update if changed by more than 10px (reduces noise)
    if (Math.abs((current ?? 0) - y) > 10) {
      set((state) => ({
        positions: { ...state.positions, [path]: y },
      }));
    }
  },
  get: (path) => get().positions[path] ?? 0,
}));