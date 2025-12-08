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
import { InfoIcon, Plus } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();

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
      <DashboardContent />
    </SidebarProvider>
  );
};

const DashboardContent = () => {
  const { routes } = useRouteStore();
  const { isSidebarOpen } = useSidebar();
  const { isMobile } = useSidebar();
  const { authUser } = useAuthStore();
  const [githubStarCount, setGithubStarCount] = useState(null);
  const [visibleBreadcrumbs, setVisibleBreadcrumbs] = useState(3);
  const navigate = useNavigate();

  // Determine number of visible breadcrumbs based on viewport width
  useEffect(() => {
    const updateVisibleBreadcrumbs = () => {
      const width = window.innerWidth;
      if (width >= 1536) {
        setVisibleBreadcrumbs(5); // 2xl: show 5 breadcrumbs
      } else if (width >= 1280) {
        setVisibleBreadcrumbs(4); // xl: show 4 breadcrumbs
      } else if (width >= 1024) {
        setVisibleBreadcrumbs(3); // lg: show 3 breadcrumbs
      } else if (width >= 768) {
        setVisibleBreadcrumbs(2); // md: show 2 breadcrumbs
      } else {
        setVisibleBreadcrumbs(1); // sm: show only current breadcrumb
      }
    };

    updateVisibleBreadcrumbs();
    window.addEventListener("resize", updateVisibleBreadcrumbs);
    return () => window.removeEventListener("resize", updateVisibleBreadcrumbs);
  }, []);

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

  // Calculate which breadcrumbs to show
  const getBreadcrumbDisplay = () => {
    if (routes.length === 0) return { visible: [], hidden: [] };

    const totalRoutes = routes.length;

    // For very small screens (1 breadcrumb), only show current
    if (visibleBreadcrumbs === 1 && totalRoutes > 1) {
      return {
        visible: [routes[routes.length - 1]],
        hidden: routes.slice(0, -1),
      };
    }

    // If total routes fit within visible limit, show all
    if (totalRoutes <= visibleBreadcrumbs) {
      return { visible: routes, hidden: [] };
    }

    // Show first route, ellipsis, and last N-1 routes
    const visible = [routes[0], ...routes.slice(-(visibleBreadcrumbs - 1))];
    const hidden = routes.slice(1, -(visibleBreadcrumbs - 1));

    return { visible, hidden };
  };

  const { visible, hidden } = getBreadcrumbDisplay();

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
                    <SidebarOpenTrigger className="-ml-1 bg-muted/50 size-11 rounded-full border sm:border-none sm:size-8 sm:bg-transparent sm:rounded-md" />
                  </TooltipWrapper>
                  <Separator orientation="vertical" className="mr-2 h-4" />
                </>
              )}

              <Breadcrumb className="flex-1 min-w-0">
                <BreadcrumbList className="flex-nowrap">
                  {hidden.length > 0 && visibleBreadcrumbs === 1 && (
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
                            className="min-w-32 transition-all"
                            align="start"
                          >
                            {hidden.map((hiddenRoute, hiddenIndex) => (
                              <Link
                                key={hiddenIndex}
                                className="block truncate whitespace-nowrap w-full"
                                to={hiddenRoute.path}
                              >
                                <DropdownMenuItem className="px-2 py-1 min-w-0">
                                  {hiddenRoute.name}
                                </DropdownMenuItem>
                              </Link>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  )}

                  {visible.map((route, index) => (
                    <React.Fragment key={route.path}>
                      {index === 1 &&
                        hidden.length > 0 &&
                        visibleBreadcrumbs > 1 && (
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
                                  className="min-w-32 transition-all"
                                  align="start"
                                >
                                  {hidden.map((hiddenRoute, hiddenIndex) => (
                                    <Link
                                      key={hiddenIndex}
                                      className="block truncate whitespace-nowrap w-full"
                                      to={hiddenRoute.path}
                                    >
                                      <DropdownMenuItem className="px-2 py-1 min-w-0">
                                        {hiddenRoute.name}
                                      </DropdownMenuItem>
                                    </Link>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                          </>
                        )}

                      <BreadcrumbItem className="min-w-0">
                        <Link
                          to={route.path}
                          className={`truncate block min-w-0 ${
                            index === visible.length - 1
                              ? "text-foreground"
                              : ""
                          }`}
                        >
                          {route.name}
                        </Link>
                      </BreadcrumbItem>

                      {index < visible.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex-shrink-0 mr-4 flex items-center gap-2">
              <SearchButton />
              {!authUser ? (
                <div className="flex gap-2">
                  <ModeToggleMini className={"size-9"} />
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
                          <svg
                            width="98"
                            height="96"
                            viewBox="0 0 98 96"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_23_2)">
                              <path
                                fill-rule="evenodd"
                                clipRule="evenodd"
                                d="M48.854 0C21.839 0 0 22 0 49.217C0 70.973 13.993 89.389 33.405 95.907C35.832 96.397 36.721 94.848 36.721 93.545C36.721 92.404 36.641 88.493 36.641 84.418C23.051 87.352 20.221 78.551 20.221 78.551C18.037 72.847 14.801 71.381 14.801 71.381C10.353 68.366 15.125 68.366 15.125 68.366C20.059 68.692 22.648 73.418 22.648 73.418C27.015 80.914 34.052 78.796 36.883 77.492C37.287 74.314 38.582 72.114 39.957 70.892C29.118 69.751 17.714 65.514 17.714 46.609C17.714 41.231 19.654 36.831 22.728 33.409C22.243 32.187 20.544 27.134 23.214 20.371C23.214 20.371 27.339 19.067 36.64 25.423C40.6221 24.3457 44.7288 23.7976 48.854 23.793C52.979 23.793 57.184 24.364 61.067 25.423C70.369 19.067 74.494 20.371 74.494 20.371C77.164 27.134 75.464 32.187 74.979 33.409C78.134 36.831 79.994 41.231 79.994 46.609C79.994 65.514 68.59 69.669 57.67 70.892C59.45 72.44 60.986 75.373 60.986 80.018C60.986 86.618 60.906 91.915 60.906 93.544C60.906 94.848 61.796 96.397 64.222 95.908C83.634 89.388 97.627 70.973 97.627 49.217C97.707 22 75.788 0 48.854 0Z"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_23_2">
                                <rect width="98" height="96" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                          {githubStarCount || ""}
                        </Button>
                      </a>
                    </TooltipWrapper>
                  )}

                  <Link to={`/user/${authUser?.userName}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={authUser?.avatar} />
                          <AvatarFallback>
                            {(authUser?.fullName || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-pretty">
                        <div>
                          <p className="text-sm font-medium">
                            {authUser?.fullName}
                          </p>
                          <div className="text-primary-foreground/80 text-xs">
                            <p>{`@${authUser?.userName}`}</p>
                            <p>{authUser?.email}</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
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
