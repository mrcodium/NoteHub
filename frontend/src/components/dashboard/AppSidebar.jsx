"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { FolderPlus, CopyMinus, Search, X } from "lucide-react";

import NavMain from "@/components/dashboard/NavMain";
import NavUser from "@/components/dashboard/NavUser";

import {
  Sidebar,
  SidebarCloseTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarOpenTrigger,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useNoteStore } from "@/stores/useNoteStore";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { SidebarSearch } from "./SidebarSearch";
import TooltipWrapper from "../TooltipWrapper";
import { useLocalStorage } from "@/stores/useLocalStorage";
import SettingSidebar from "./SettingSidebar";

const AppSidebar = (props) => {
  const { getHierarchy, createCollection, collections } = useNoteStore();
  const [collectionName, setCollectionName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { collapseAll } = useLocalStorage();

  useEffect(() => {
    getHierarchy();
  }, [getHierarchy]);

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
                    className="size-7 text-sidebar-accent-foreground/70"
                    variant="ghost"
                    onClick={collapseAll}
                  >
                    <CopyMinus />
                  </Button>
                </TooltipWrapper>

                <TooltipWrapper message="Search File">
                  <Button
                    className="size-7 w-7 h-7 text-sidebar-accent-foreground/70"
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
