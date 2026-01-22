import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import React, { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import AppSidebar from "@/components/dashboard/AppSidebar";
import DashboardHeader from "./DashboardHeader";
import { useEditorStore } from "@/stores/useEditorStore";

const Dashboard = () => {
  const { authUser } = useAuthStore();
  const scrollRef = useRef(null);
  const { setScrollRef } = useEditorStore();

  useEffect(() => {
    setScrollRef(scrollRef);
    return () => setScrollRef(null);
  }, []);

  return (
    <SidebarProvider>
      {authUser && <AppSidebar />}

      <SidebarInset className="scrollbar-custom relative w-full h-svh overflow-hidden">
        <DashboardHeader />

        <div ref={scrollRef} className="overflow-x-hidden h-full">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;
