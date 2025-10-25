import {
  Camera,
  CircleUserRound,
  KeyRound,
  PaintbrushVertical,
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import React from "react";
import { Link, useLocation } from "react-router-dom";

const settings = [
  {
    name: "Personalization",
    url: "/settings/personalization",
    icon: PaintbrushVertical,
  },
  {
    name: "Photo and cover",
    url: "/settings/photo-and-cover",
    icon: Camera,
  },
  {
    name: "Personal Details",
    url: "/settings/personal-details",
    icon: CircleUserRound,
  },

  {
    name: "Security",
    url: "/settings/security",
    icon: KeyRound,
  },
];

const SettingSidebar = () => {
const { closeSidebar, isMobile } = useSidebar();
  const location = useLocation();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Settings</SidebarGroupLabel>
      <SidebarMenu>
        {settings.map((item) => {
          const isActive =
            location.pathname.split("/").join("") ===
            item.url.split("/").join("");
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                className={isActive && "bg-sidebar-accent"}
              >
                <Link onClick={() => isMobile && closeSidebar()} to={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default SettingSidebar;
