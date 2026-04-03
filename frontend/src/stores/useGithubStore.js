import { create } from "zustand";
import axios from "axios";
import { formatCompactNumber } from "@/lib/utils";

export const useGithubStore = create((set) => ({
  starCount: null,
  fetchStars: async () => {
    try {
      const response = await axios.get(
        "https://api.github.com/repos/abhijeetSinghRajput/notehub"
      );
      const count = response.data?.stargazers_count ?? 0;
      set({ starCount: formatCompactNumber(count) });
    } catch (error) {
      console.error("Failed to fetch GitHub stars", error);
      set({ starCount: null });
    }
  },
}));
