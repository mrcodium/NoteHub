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
} from "@/components/ui/sidebar";
import { useNoteStore } from "@/stores/useNoteStore";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { SidebarSearch } from "./SidebarSearch";
import TooltipWrapper from "../TooltipWrapper";
import { useLocalStorage } from "@/stores/useLocalStorage";
import SettingSidebar from "./SettingSidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { ModeToggleMini } from "../mode-toggle";

const AppSidebar = (props) => {
  const { getCollections, collections } = useNoteStore();
  const { authUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const { collapseAll } = useLocalStorage();

  useEffect(() => {
    getCollections({
      userId: authUser._id,
    });
  }, [getCollections]);

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
            <TooltipWrapper message="Close Searchbar">
              <Button
                variant="ghost"
                className="size-8"
                onClick={handleCloseSearch}
              >
                <X />
              </Button>
            </TooltipWrapper>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <TooltipWrapper message={"Close Sidebar Ctrl M"}>
                <SidebarCloseTrigger />
              </TooltipWrapper>
              <Link to="/" className="logo truncate font">
                NoteHub
              </Link>
            </div>

            {!location.pathname.startsWith("/settings") && (
              <div className="flex buttons-container">
                <TooltipWrapper message="Collapse All">
                  <Button
                    className="size-8 text-sidebar-accent-foreground/70"
                    variant="ghost"
                    onClick={collapseAll}
                  >
                    <CopyMinus />
                  </Button>
                </TooltipWrapper>

                <ModeToggleMini className={"text-accent-foreground/70"} />
                
                <TooltipWrapper message="Search File">
                  <Button
                    className="size-8 text-sidebar-accent-foreground/70"
                    variant="ghost"
                    onClick={() => {
                      setShowSearch(true);
                    }}
                  >
                    <Search />
                  </Button>
                </TooltipWrapper>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {location.pathname.startsWith("/settings") ? (
          <SettingSidebar />
        ) : (
          <MemoizedNavMain
            collections={collections}
            searchQuery={searchQuery}
          />
        )}
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
