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
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { SearchButton } from "@/components/SearchButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggleMini } from "@/components/mode-toggle";

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
  const { isMobile } = useSidebar();
  const { authUser } = useAuthStore();
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
      {authUser && <AppSidebar />}

      <SidebarInset className="scrollbar-custom relative w-max h-svh overflow-hidden">
        <header className="z-50 flex border-b sticky top-0 bg-background justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="max-w-screen-2xl w-full mx-auto flex justify-between">
            <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
              {!isSidebarOpen && authUser && (
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
              {!authUser ? (
                <div className="flex gap-2">
                  <ModeToggleMini />
                  <Button onClick={() => navigate("/login")}>Login</Button>
                </div>
              ) : (
                <>
                  <AddNoteDrawer
                    trigger={
                      <Button className={`size-8`}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {!isMobile && (
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

                  <Link to={`/user/${authUser?.userName}`}>
                    <TooltipWrapper message={authUser?.fullName}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={authUser?.avatar} />
                        <AvatarFallback>
                          {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipWrapper>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </>
  );
};

export default Dashboard;
