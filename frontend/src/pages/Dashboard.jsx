import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/dashboard/AppSidebar";
import DashboardHeader from "./DashboardHeader";

import { useAuthStore } from "@/stores/useAuthStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useScrollStore } from "@/stores/useScrollStore";

const Dashboard = () => {
  const { authUser } = useAuthStore();
  const { setScrollRef } = useEditorStore();
  const { positions, save } = useScrollStore();

  const location = useLocation();
  const scrollRef = useRef(null);

  /* ---------------- RESTORE SCROLL ---------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const y = positions[location.pathname] ?? 0;

    // Double RAF ensures DOM is fully painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: y,
          behavior: "instant", // or 'auto'
        });
      });
    });
  }, [location.pathname, positions]);

  /* ---------------- SAVE SCROLL ---------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timeoutId;
    const onScroll = () => {
      // Debounce: only save after scrolling stops
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        save(location.pathname, el.scrollTop);
      }, 150); // Save 150ms after scroll stops
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, [location.pathname, save]);

  /* -------- expose scrollRef for editor / button -------- */
  useEffect(() => {
    setScrollRef(scrollRef);
    return () => setScrollRef(null);
  }, [setScrollRef]);

  return (
    <SidebarProvider>
      {authUser && <AppSidebar />}

      <SidebarInset className="relative w-full h-svh overflow-hidden">
        <DashboardHeader />

        {/* ❌ parent does NOT scroll */}
        <div className="h-full overflow-x-hidden">
          {/* ✅ ACTUAL scroll container */}
          <div
            ref={scrollRef}
            className="scrollRef h-full overflow-y-auto overflow-x-hidden p-4 bg-[#f5f5f5] dark:bg-background"
          >
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;
