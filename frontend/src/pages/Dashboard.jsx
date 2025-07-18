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
import { Plus, ArrowLeft, Telescope, X, Clock, Trash2 } from "lucide-react";
import AddNoteDrawer from "@/components/AddNoteDrawer";
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
import { SearchButton } from "@/components/SearchButton";

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
  const { getAllUsers, authUser } = useAuthStore();
  const [githubStarCount, setGithubStarCount] = useState(null);
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

  return (
    <>
      <AppSidebar />

      <SidebarInset className="scrollbar-custom relative w-max h-svh overflow-hidden">
        <header className="z-50 flex border-b sticky top-0 bg-background justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
            {!isSidebarOpen && (
              <>
                <TooltipWrapper message={"Open Sidebar Ctrl M"}>
                  <SidebarOpenTrigger className="-ml-1" />
                </TooltipWrapper>
                <Separator orientation="vertical" className="mr-2 h-4" />
              </>
            )}

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
                          {routes
                            .slice(0, -1)
                            .reverse()
                            .map((route, index) => (
                              <Link
                                key={index}
                                className="block truncate whitespace-nowrap w-full"
                                to={route.path}
                              >
                                <DropdownMenuItem className="px-2 py-1 min-w-0 ">
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
          </div>

          <div className="flex-shrink-0 mr-4 flex items-center gap-2">
            <SearchButton />

            <AddNoteDrawer
              trigger={
                <Button className={`size-8`}>
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
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
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </>
  );
};

export default Dashboard;
