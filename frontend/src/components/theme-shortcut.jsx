// components/theme-shortcut.jsx
import { useEffect } from "react";
import { useTheme } from "./theme-provider";

export function ThemeShortcut() {
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const down = (e) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleTheme();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggleTheme]);

  return null;
}