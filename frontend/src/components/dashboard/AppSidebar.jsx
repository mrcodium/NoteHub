"use client";

import React, { useEffect, useState, useRef } from "react";
import { CopyMinus, Search, X } from "lucide-react";

import NavMain from "@/components/dashboard/NavMain";
import NavUser from "@/components/dashboard/NavUser";

import {
  Sidebar,
  SidebarCloseTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNoteStore } from "@/stores/useNoteStore";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { SidebarSearch } from "./SidebarSearch";
import { useLocalStorage } from "@/stores/useLocalStorage";
import SettingSidebar from "./SettingSidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { ModeToggleMini } from "../mode-toggle";

const AppSidebar = (props) => {
  const { getAllCollections, collections } = useNoteStore();
  const { authUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const { collapseAll } = useLocalStorage();
  const { closeSidebar, isMobile } = useSidebar();

  useEffect(() => {
    getAllCollections({
      userId: authUser._id,
    });
  }, [getAllCollections]);

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-2 pl-4 h-16 justify-center">
        {showSearch ? (
          <div className="flex gap-2 items-center">
            <SidebarSearch
              setShowSearch={setShowSearch}
              inputRef={searchRef}
              onSearch={setSearchQuery}
            />
            <Button
              tooltip="Close Searchbar"
              variant="ghost"
              className="size-8"
              onClick={handleCloseSearch}
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <SidebarCloseTrigger tooltip={"Close Sidebar Ctrl M"} />
              <Link
                onClick={() => isMobile && closeSidebar()}
                to="/"
                className="logo truncate font"
              >
                NoteHub
              </Link>
            </div>

            <div className="flex buttons-container">
              {!location.pathname.startsWith("/settings") && (
                <>
                  <Button
                    message="Collapse All"
                    className="size-8 text-sidebar-accent-foreground/70"
                    variant="ghost"
                    onClick={collapseAll}
                  >
                    <CopyMinus />
                  </Button>

                  <Button
                    message="Search File"
                    className="size-8 text-sidebar-accent-foreground/70"
                    variant="ghost"
                    onClick={() => {
                      setShowSearch(true);
                    }}
                  >
                    <Search />
                  </Button>
                </>
              )}
              <ModeToggleMini className={"text-accent-foreground/70"} />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <MemoizedNavMain collections={collections} searchQuery={searchQuery} />
      </SidebarContent>

      <SidebarFooter className="border-t">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const MemoizedNavMain = React.memo(NavMain);

export default AppSidebar;
