import React, { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarOpenTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";

import { useAuthStore } from "@/stores/useAuthStore";
import { useRouteStore } from "@/stores/useRouteStore";
import AddNoteDrawer from "@/components/AddNoteDrawer";
import { SearchButton } from "@/components/SearchButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggleMini } from "@/components/mode-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TooltipWrapper from "@/components/TooltipWrapper";
import GithubIcon from "@/components/githubIcon";
import { useGithubStore } from "@/stores/useGithubStore";
import { cn } from "@/lib/utils";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { routes } = useRouteStore();
  const { authUser } = useAuthStore();
  const { isSidebarOpen, isMobile } = useSidebar();
  const [visibleBreadcrumbs, setVisibleBreadcrumbs] = useState(3);
  const githubStarCount = useGithubStore((s) => s.starCount);
  const location = useLocation();

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

  // Calculate which breadcrumbs to show
  const getBreadcrumbDisplay = () => {
    if (routes.length === 0) return { visible: [], hidden: [] };

    const totalRoutes = routes.length;

    // Special case: if only 2 routes and first is '/', always show both (logo + current)
    if (totalRoutes === 2 && routes[0].path === "/") {
      return { visible: routes, hidden: [] };
    }

    // For very small screens (1 breadcrumb), only show current
    if (visibleBreadcrumbs === 1 && totalRoutes > 1) {
      return {
        visible: [routes[routes.length - 1]],
        hidden: routes.slice(0, -1).reverse(),
      };
    }

    // If total routes fit within visible limit, show all
    if (totalRoutes <= visibleBreadcrumbs) {
      return { visible: routes, hidden: [] };
    }

    // Show first route, ellipsis, and last N-1 routes
    const visible = [routes[0], ...routes.slice(-(visibleBreadcrumbs - 1))];
    const hidden = routes.slice(1, -(visibleBreadcrumbs - 1)).reverse();

    return { visible, hidden };
  };

  const { visible, hidden } = getBreadcrumbDisplay();

  return (
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
                    <DropdownMenu modal={true} className="z-50 transition-all">
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
                      className={`truncate flex items-center gap-2 min-w-0 ${
                        index === visible.length - 1 ? "text-foreground" : ""
                      }
                      ${route.path === "/" ? "logo" : ""}
                      `}
                    >
                      {route.path === "/" && (
                        <div className="size-6 bg-[#171717] rounded-full">
                          <img
                            className="w-full h-full object-contain"
                            src="/n.svg"
                            alt="Notehub Logo"
                          />
                        </div>
                      )}
                      <span
                        className={cn(
                          "truncate",
                          route.path === "/"
                            ? location.pathname === "/"
                              ? "inline"
                              : "hidden" // hide home name if not on /
                            : "inline", // all other route names visible
                        )}
                      >
                        {route.name}
                      </span>
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

          {!isMobile && (
            <TooltipWrapper message="Source Code">
              <a href="https://github.com/abhijeetSinghRajput/notehub">
                <Button size="sm" className="p-2" variant="secondary">
                  <GithubIcon />
                  {githubStarCount || ""}
                </Button>
              </a>
            </TooltipWrapper>
          )}

          {!authUser ? (
            <div className="flex gap-2">
              <ModeToggleMini className={"size-9"} />
              <Button onClick={() => navigate("/login")}>Login</Button>
            </div>
          ) : (
            <>
              <AddNoteDrawer
                trigger={
                  <Button tooltip="Create Notes" className={`size-8`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                }
              />

              <Link
                to={`/user/${authUser?.userName}`}
                aria-label={`Go to ${authUser?.fullName || "user"} profile`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={authUser?.avatar}
                        alt={authUser?.fullName || "User Profile Photo"}
                      />
                      <AvatarFallback>
                        {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent align="end" className="max-w-64 text-pretty">
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
  );
};

export default DashboardHeader;