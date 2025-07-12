// frontend/src/stores/useNetworkStore.jsx
import { create } from "zustand";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

export const useNetworkStore = create((set, get) => {
  const isOnline = navigator.onLine;

  // Side-effect: watcher logic
  const initNetworkWatcher = () => {
    const setOnline = (status) => {
      set({ isOnline: status });

      if (status) {
        toast.success("Connected", {
          description: "You're back online",
          duration: 4000,
          icon: <CheckCircle className="text-green-500" />,
          action: {
            label: (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </div>
            ),
            onClick: () => location.reload(),
          },
        });
      } else {
        toast("Connection Lost", {
          description: "You're currently offline. Changes may not be saved.",
          icon: <AlertTriangle className="text-yellow-500" />,
          action: {
            label: (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </div>
            ),
            onClick: () => location.reload(),
          },
          duration: 8000,
        });
      }
    };

    // Fire once on load
    setOnline(isOnline);

    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));

    // Cleanup function
    return () => {
      window.removeEventListener("online", () => setOnline(true));
      window.removeEventListener("offline", () => setOnline(false));
    };
  };

  // Auto-init watcher once
  initNetworkWatcher();

  return {
    isOnline,
  };
});