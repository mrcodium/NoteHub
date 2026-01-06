import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { useAuthStore } from "@/stores/useAuthStore";
import AppSidebar from "@/components/dashboard/AppSidebar";
import DashboardHeader from "./DashboardHeader";
import { useEditorStore } from "@/stores/useEditorStore";

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const { authUser } = useAuthStore();
  const scrollRef = useRef(null);
  const { setScrollRef } = useEditorStore();

  useEffect(() => {
    setScrollRef(scrollRef);
    return () => setScrollRef(null);
  }, []);

  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleTheme();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [theme]);

  return (
    <SidebarProvider>
      {authUser && <AppSidebar />}

      <SidebarInset className="scrollbar-custom relative w-full h-svh">
        <DashboardHeader />

        <div ref={scrollRef} className="overflow-x-hidden h-full">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;
