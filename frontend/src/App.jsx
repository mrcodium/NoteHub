// React core
import React, { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

// Styles & theme
import "./stores/useNetworkStore";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeShortcut } from "./components/theme-shortcut";

// UI libraries
import { Toaster } from "sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Loader } from "lucide-react";

// Stores
import { useAuthStore } from "./stores/useAuthStore";
import { useRouteStore } from "./stores/useRouteStore";
import { useNoteStore } from "./stores/useNoteStore";
import { useGithubStore } from "./stores/useGithubStore";

// Context
import { CollaboratorManagerProvider } from "./contex/CollaboratorManagerContext";

// Components (keep small components non-lazy)
import { CollaboratorsDialog } from "./pages/collection/CollaboratorsDialog";

// Lazy-loaded pages
const Tiptap = lazy(() => import("./components/editor/Tiptap"));
const LogInPage = lazy(() => import("./pages/LogInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const ForgetPasswordPage = lazy(() => import("./pages/ForgetPasswordPage"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotePage = lazy(() => import("./pages/NotePage"));
const NotePagePublic = lazy(() => import("./pages/NotePagePublic"));
const CollectionPage = lazy(() => import("./pages/collection/CollectionPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Profile = lazy(() => import("./pages/Settings/Profile"));
const Appearance = lazy(() => import("./pages/Settings/Appearance"));
const Security = lazy(() => import("./pages/Settings/Security"));
const Photos = lazy(() => import("./pages/Settings/Photos"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader className="animate-spin" />
  </div>
);

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const fetchStars = useGithubStore((s) => s.fetchStars);

  useEffect(() => {
    fetchStars();
  }, []);

  useEffect(() => {
    checkAuth();
    const radius = localStorage.getItem("radius") || 0.5;
    document.documentElement.style.setProperty("--radius", `${radius}rem`);
  }, [checkAuth]);

  const { setRoutes } = useRouteStore();
  const { getNoteName, collections, setselectedNote } = useNoteStore();
  const location = useLocation();

  useEffect(() => {
    let path = "/";
    setselectedNote(null);

    const segments = location.pathname.split("/").filter(Boolean);
    const routes = [{ name: "NoteHub", path: "/" }];
    for (let i = 0; i < segments.length; i++) {
      let segment = segments[i];
      path += `${segment}/`;
      if (segment === "note") {
        const noteId = segments[++i];
        path += `${noteId}/`;
        let noteName = getNoteName(noteId) || "Not found";
        routes.push({ name: noteName, path });
        setselectedNote(noteId);
      } else if (segment === "user") {
        const username = segments[++i];
        path += `${username}/`;
        routes.push({ name: username, path });
      } else {
        const name = segment;
        routes.push({ name, path });
      }
    }
    setRoutes(routes);
  }, [location, collections]);

  if (isCheckingAuth) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <div className="flex flex-col gap-2 items-center justify-center h-screen">
          <div className="logo text-xl text-foreground/70">Notehub</div>
          <Loader className="animate-spin" />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ThemeShortcut />
      <CollaboratorManagerProvider>
        <TooltipProvider>
          <CollaboratorsDialog />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes having base header. */}
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/login" element={<LogInPage />} />
              <Route path="/forgot-password" element={<ForgetPasswordPage />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />

              {/* Dashboard with public routes this route have a layout wrapped inside sidebarinset */}
              <Route path="/" element={<Dashboard />}>
                <Route index element={<HomePage />} />
                <Route path="user/:username" element={<ProfilePage />} />
                <Route
                  path="user/:username/:collectionSlug"
                  element={<CollectionPage />}
                />
                <Route
                  path="user/:username/:collectionSlug/:noteSlug"
                  element={<NotePagePublic />}
                />

                {/* Protected routes - only visible when authenticated */}
                {authUser && (
                  <>
                    <Route path="note/:id" element={<NotePage />} />
                    <Route path="note/:id/editor" element={<Tiptap />} />
                    <Route path="settings" element={<SettingsPage />}>
                      <Route index element={<Navigate to="appearance" replace />} />
                      <Route path="appearance" element={<Appearance />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="photos" element={<Photos />} />
                      <Route path="security" element={<Security />} />
                    </Route>
                  </>
                )}
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </CollaboratorManagerProvider>
    </ThemeProvider>
  );
}

export default App;