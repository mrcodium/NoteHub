import { createContext, useContext, useEffect, useState, useMemo } from "react";

const ThemeProviderContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(storageKey) || defaultTheme
  );

  // 1. Determine the "Real" theme being shown
  const resolvedTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }, [theme]);

  // 2. Apply theme class to HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // 3. LISTEN FOR OS CHANGES (The fix for your requirement)
  // This forces the app to change whenever Windows/macOS theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = (e) => {
      const newResolved = e.matches ? "dark" : "light";
      // Update state and storage so the app follows the OS immediately
      setTheme(newResolved);
      localStorage.setItem(storageKey, newResolved);
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [storageKey]);

  // 4. Toggle function for keyboard shortcuts / buttons
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const currentResolved =
        prevTheme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : prevTheme;

      const nextTheme = currentResolved === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, nextTheme);
      return nextTheme;
    });
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme: (newTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    toggleTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};