import AppSidebar from "@/components/dashboard/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarOpenTrigger,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useRouteStore } from "@/stores/useRouteStore";
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowLeft } from "lucide-react";
import AddNoteDialog from "@/components/AddNoteDialog";
import TooltipWrapper from "@/components/TooltipWrapper";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import axios from "axios";
import { formatCompactNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Loader2 } from "lucide-react";
import { debounce } from "lodash";

const Dashboard = () => {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

const DashboardContent = () => {
  const { routes } = useRouteStore();
  const { isSidebarOpen } = useSidebar();
  const { resolvedTheme } = useTheme();
  const { getAllUsers } = useAuthStore();
  const [githubStarCount, setGithubStarCount] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await axios.get(
          "https://api.github.com/repos/abhijeetSinghRajput/notehub"
        );
        const starCount = response.data?.stargazers_count;
        setGithubStarCount(formatCompactNumber(starCount));
      } catch (error) {
        setGithubStarCount(null);
        console.log(error);
      }
    };
    fetchStars();
  }, []);

  const fetchUsers = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await getAllUsers(1, 10, query, "all");
        setSearchResults(response.users || []);
      } catch (error) {
        console.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [getAllUsers]
  );

  useEffect(() => {
    fetchUsers(searchQuery);
    return () => fetchUsers.cancel();
  }, [searchQuery, fetchUsers]);

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleUserClick = (username) => {
    navigate(`/user/${username}`);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <>
      <AppSidebar />

      <SidebarInset className="scrollbar-custom relative w-max h-svh overflow-hidden">
        <header className="z-50 flex border-b sticky top-0 bg-background justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
            {!isSidebarOpen && !searchOpen && (
              <>
                <TooltipWrapper message={"Open Sidebar Ctrl M"}>
                  <SidebarOpenTrigger className="-ml-1" />
                </TooltipWrapper>
                <Separator orientation="vertical" className="mr-2 h-4" />
              </>
            )}

            {!searchOpen ? (
              <Breadcrumb className="flex-1 min-w-0">
                <BreadcrumbList className="flex-nowrap">
                  {routes.length > 1 ? (
                    <>
                      <BreadcrumbItem>
                        <DropdownMenu
                          modal={true}
                          className="z-50 transition-all"
                        >
                          <DropdownMenuTrigger className="flex items-center gap-1">
                            <BreadcrumbEllipsis className="size-4" />
                            <span className="sr-only">Toggle menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-32 max-w-52 transition-all"
                            align="start"
                          >
                            {routes.slice(0, -1).map((route, index) => (
                              <Link
                                key={index}
                                className="block truncate whitespace-nowrap w-full"
                                to={route.path}
                              >
                                <DropdownMenuItem
                                  className="px-2 py-1 min-w-0 "
                                >
                                  {route.name}
                                </DropdownMenuItem>
                              </Link>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  ) : null}

                  {routes.length > 0 && (
                    <BreadcrumbItem className="min-w-0">
                      <Link
                        to={routes[routes.length - 1].path}
                        className="text-foreground truncate block min-w-0"
                      >
                        {routes[routes.length - 1].name}
                      </Link>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <div className="absolute inset-0 flex items-center px-4">
                <div className="relative w-full">
                  <div className="flex items-center gap-2 w-full">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSearchToggle}
                      className="shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Search users..."
                      className="w-full text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
                      {isSearching ? (
                        <div className="p-4 flex justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        <ul>
                          {searchResults.map((user) => (
                            <li
                              key={user._id}
                              className="hover:bg-accent cursor-pointer"
                              onClick={() => handleUserClick(user.userName)}
                            >
                              <div className="flex items-center gap-3 p-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={user.avatar}
                                    alt={user.fullName}
                                    className="rounded-full"
                                  />
                                  <AvatarFallback>
                                    <img src="/avatar.png" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.fullName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    @{user.userName}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 mr-4 flex items-center gap-2">
            {!searchOpen && (
              <>
                <TooltipWrapper message="Search users">
                  <Button
                    variant="ghost"
                    className="size-8"
                    onClick={handleSearchToggle}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
                <AddNoteDialog
                  trigger={
                    <Button className={`size-8 sm:w-auto`}>
                      <Plus className="h-4 w-4" />
                      <span className={`hidden sm:block`}>Add Note</span>
                    </Button>
                  }
                />
              </>
            )}

            {!searchOpen && (
              <TooltipWrapper message="Source Code">
                <a href="https://github.com/abhijeetSinghRajput/notehub">
                  <Button size="sm" className="p-2" variant="secondary">
                    <img
                      src={
                        resolvedTheme === "dark"
                          ? "/github-mark-white.svg"
                          : "/github-mark.svg"
                      }
                      alt="github logo"
                      className="size-5 object-contain"
                    />
                    {githubStarCount || ""}
                  </Button>
                </a>
              </TooltipWrapper>
            )}
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </>
  );
};

export default Dashboard;
